/**
 * useMaggi — React binding for the MAGGI RAG engine.
 *
 * Keeps a single MaggiStore instance warm across renders, exposes ingest /
 * retrieval / answer actions, and mirrors the dashboard state (stats, docs,
 * usage, progress) into React state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaggiStore, getMaggiStore, IngestProgress, QueryResult, MaggiUsage } from '../services/maggi/store';
import { MaggiSettings, DEFAULT_MAGGI_SETTINGS } from '../maggi/config';
import { RagDocument, RagChunk, RagIndexStats, RetrievedContext, SavedMaggiQuery, PersistedMaggiMessage } from '../services/maggi/types';
import { IngestSource } from '../services/maggi/extract';

export interface MaggiChatMessage extends PersistedMaggiMessage {
  isStreaming?: boolean;
}

export interface UseMaggiOptions {
  /** Media items from the active workspace, offered as a one-click import. */
  workspaceItems?: Array<{ id: string; name: string; type: string; mimeType?: string; data: string }>;
  workspaceName?: string;
}

const uid = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toPersisted = (msgs: MaggiChatMessage[]): PersistedMaggiMessage[] =>
  msgs.map(({ isStreaming: _s, ...rest }) => rest);

export const useMaggi = (options: UseMaggiOptions = {}) => {
  const storeRef = useRef<MaggiStore | null>(null);
  if (!storeRef.current) storeRef.current = getMaggiStore();
  const store = storeRef.current;

  const [settings, setSettingsState] = useState<MaggiSettings>(() => store.getSettings());
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [stats, setStats] = useState<RagIndexStats>(() => store.stats());
  const [usage, setUsage] = useState<MaggiUsage>(() => store.getUsage());
  const [savedQueries, setSavedQueries] = useState<SavedMaggiQuery[]>(() => store.listSavedQueries());
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [messages, setMessages] = useState<MaggiChatMessage[]>(() => store.getChatMessages());
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isAnsweringRef = useRef(false);
  isAnsweringRef.current = isAnswering;

  const refresh = useCallback(() => {
    setSettingsState(store.getSettings());
    setDocuments(store.listDocuments());
    setStats(store.stats());
    setUsage(store.getUsage());
    setSavedQueries(store.listSavedQueries());
    if (!isAnsweringRef.current) {
      const persisted = store.getChatMessages();
      setMessages((prev) => {
        // Avoid replacing identical arrays unnecessarily
        if (prev.length === persisted.length && prev.every((m, i) => m.id === persisted[i]?.id && m.content === persisted[i]?.content)) {
          return prev;
        }
        return persisted;
      });
    }
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    store.hydrate().then(() => {
      if (cancelled) return;
      setIsReady(true);
      setMessages(store.getChatMessages());
      refresh();
    });
    const unsubscribe = store.subscribe(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store, refresh]);

  const updateSettings = useCallback((patch: Partial<MaggiSettings>) => {
    const next = store.updateSettings(patch);
    setSettingsState(next);
    return next;
  }, [store]);

  const resetSettings = useCallback(() => {
    const next = store.updateSettings({ ...DEFAULT_MAGGI_SETTINGS });
    setSettingsState(next);
    return next;
  }, [store]);

  const ingest = useCallback(async (sources: IngestSource[]) => {
    setIsIngesting(true);
    setError(null);
    try {
      const result = await store.ingest(sources, (p) => setProgress(p));
      refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setIsIngesting(false);
      setProgress(null);
    }
  }, [store, refresh]);

  const addNote = useCallback(async (title: string, text: string) => {
    setIsIngesting(true);
    try {
      const result = await store.addNote(title, text);
      refresh();
      return result;
    } finally {
      setIsIngesting(false);
      setProgress(null);
    }
  }, [store, refresh]);

  const importWorkspace = useCallback(async () => {
    const items = options.workspaceItems ?? [];
    if (!items.length) return [];
    return ingest(items.map((it) => ({
      id: it.id,
      name: it.name,
      type: it.type,
      mimeType: it.mimeType,
      data: it.data,
    })));
  }, [ingest, options.workspaceItems]);

  const removeDocument = useCallback(async (docId: string) => {
    await store.removeDocument(docId);
    refresh();
  }, [store, refresh]);

  const clearIndex = useCallback(async () => {
    await store.clear();
    setMessages([]);
    refresh();
  }, [store, refresh]);

  const getChunks = useCallback((docId: string): RagChunk[] => store.getChunksForDocument(docId), [store]);
  const getRelated = useCallback((chunkId: string, limit?: number) => store.relatedChunks(chunkId, limit), [store]);

  const search = useCallback(async (query: string): Promise<RetrievedContext> => {
    const ctx = await store.search(query);
    refresh();
    return ctx;
  }, [store, refresh]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsAnswering(false);
    setMessages((prev) => {
      const next = prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m));
      void store.saveChatMessages(toPersisted(next));
      return next;
    });
  }, [store]);

  const ask = useCallback(async (query: string, useStreaming = true) => {
    const trimmed = query.trim();
    if (!trimmed || isAnswering) return;

    setError(null);
    const userMsg: MaggiChatMessage = { id: uid(), role: 'user', content: trimmed, timestamp: Date.now() };
    const assistantId = uid();
    const placeholder: MaggiChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    const history = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setIsAnswering(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await store.ask(trimmed, history, {
        signal: controller.signal,
        useStreaming,
        onDelta: useStreaming
          ? (delta) => {
            setMessages((prev) => prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ));
          }
          : undefined,
      });

      setMessages((prev) => {
        const next = prev.map((m) => m.id === assistantId
          ? {
            ...m,
            content: result.answer,
            citations: result.citations,
            retrieval: result.retrieval,
            usage: result.usage,
            isStreaming: false,
          }
          : m);
        void store.saveChatMessages(toPersisted(next));
        return next;
      });
      refresh();
    } catch (e: any) {
      const aborted = e?.name === 'AbortError';
      setMessages((prev) => {
        const next = prev.map((m) => m.id === assistantId
          ? {
            ...m,
            content: aborted ? (m.content || 'Stopped.') : `⚠️ ${e?.message || 'MAGGI failed to answer.'}`,
            isStreaming: false,
            error: !aborted,
          }
          : m);
        void store.saveChatMessages(toPersisted(next));
        return next;
      });
      if (!aborted) setError(e?.message || 'MAGGI failed to answer.');
    } finally {
      setIsAnswering(false);
      abortRef.current = null;
    }
  }, [isAnswering, messages, store, refresh]);

  const clearChat = useCallback(() => {
    setMessages([]);
    void store.clearChatMessages();
  }, [store]);

  // --- saved queries CRUD --------------------------------------------------

  const saveMessageAsQuery = useCallback(async (assistantMsgId: string, title?: string): Promise<SavedMaggiQuery | null> => {
    const idx = messages.findIndex((m) => m.id === assistantMsgId);
    if (idx < 0) return null;
    const assistantMsg = messages[idx];
    if (assistantMsg.role !== 'assistant' || !assistantMsg.content.trim() || assistantMsg.error) return null;

    let queryText = '';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        queryText = messages[i].content;
        break;
      }
    }

    const saved = await store.saveQuery({
      title,
      query: queryText || 'MAGGI Research Answer',
      answer: assistantMsg.content,
      citations: assistantMsg.citations,
      retrieval: assistantMsg.retrieval,
      usage: assistantMsg.usage,
      workspaceName: options.workspaceName,
    });
    setSavedQueries(store.listSavedQueries());
    return saved;
  }, [messages, store, options.workspaceName]);

  const saveCurrentChatAsQuery = useCallback(async (title?: string): Promise<SavedMaggiQuery | null> => {
    const valid = messages.filter((m) => !m.error && m.content.trim());
    const lastAssistant = [...valid].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return null;
    return saveMessageAsQuery(lastAssistant.id, title);
  }, [messages, saveMessageAsQuery]);

  const togglePinQuery = useCallback(async (id: string) => {
    const target = savedQueries.find((q) => q.id === id);
    if (!target) return;
    await store.updateSavedQuery(id, { pinned: !target.pinned });
    setSavedQueries(store.listSavedQueries());
  }, [savedQueries, store]);

  const renameSavedQuery = useCallback(async (id: string, title: string) => {
    await store.updateSavedQuery(id, { title });
    setSavedQueries(store.listSavedQueries());
  }, [store]);

  const deleteSavedQuery = useCallback(async (id: string) => {
    await store.deleteSavedQuery(id);
    setSavedQueries(store.listSavedQueries());
  }, [store]);

  const clearSavedQueries = useCallback(async () => {
    await store.clearSavedQueries();
    setSavedQueries([]);
  }, [store]);

  const loadSavedQueryIntoChat = useCallback(async (saved: SavedMaggiQuery) => {
    const userMsg: MaggiChatMessage = {
      id: uid(),
      role: 'user',
      content: saved.query,
      timestamp: saved.createdAt,
    };
    const assistantMsg: MaggiChatMessage = {
      id: uid(),
      role: 'assistant',
      content: saved.answer,
      timestamp: saved.updatedAt,
      citations: saved.citations,
      usage: saved.usage,
    };
    const next = [...messages, userMsg, assistantMsg];
    setMessages(next);
    await store.saveChatMessages(toPersisted(next));
  }, [messages, store]);

  const backendLabel = useMemo(() => {
    if (stats.vectorBackend === 'gemini') return 'Gemini embeddings';
    if (stats.vectorBackend === 'freellmapi') return 'FreeLLMAPI embeddings';
    if (stats.vectorBackend === 'hash') return 'Local hash embeddings (offline)';
    return 'No vectors yet';
  }, [stats.vectorBackend]);

  return {
    // state
    settings,
    documents,
    stats,
    usage,
    savedQueries,
    isReady,
    progress,
    isIngesting,
    messages,
    isAnswering,
    error,
    backendLabel,
    // actions
    updateSettings,
    resetSettings,
    ingest,
    addNote,
    importWorkspace,
    removeDocument,
    clearIndex,
    getChunks,
    getRelated,
    search,
    ask,
    stop,
    clearChat,
    refresh,
    saveMessageAsQuery,
    saveCurrentChatAsQuery,
    togglePinQuery,
    renameSavedQuery,
    deleteSavedQuery,
    clearSavedQueries,
    loadSavedQueryIntoChat,
  };
};

export type UseMaggiReturn = ReturnType<typeof useMaggi>;

