
import React, { useState, useRef, useEffect } from 'react';
import { MindMapNode, MediaItem } from '../types';
import { expandMindMapNode, fetchNodeDescription } from '../services/mindMapService';

interface MindMapViewProps {
  data: MindMapNode | null;
  sources?: MediaItem[];
  onClose: () => void;
  onRefresh?: () => void;
  onNodeDoubleClick?: (label: string) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  label: string;
  level: number;
  parentId?: string;
  description?: string;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const LEVEL_GAP = 250;
const VERTICAL_GAP = 80;

const MindMapViewer: React.FC<MindMapViewProps> = ({ data, onClose, onRefresh, sources = [], onNodeDoubleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [treeData, setTreeData] = useState<MindMapNode | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  const [describingNodeId, setDescribingNodeId] = useState<string | null>(null);
  const [activeDescription, setActiveDescription] = useState<{id: string, text: string, x: number, y: number} | null>(null);

  useEffect(() => {
    if (data) {
        setTreeData(JSON.parse(JSON.stringify(data)));
    }
  }, [data]);

  useEffect(() => {
    if (!treeData) return;
    const newNodes: NodePosition[] = [];
    let currentY = 0;
    const calculateLayout = (node: MindMapNode, level: number, parentId?: string) => {
      const myId = node.id || crypto.randomUUID();
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
           calculateLayout(child, level + 1, myId);
        });
        const childNodes = newNodes.filter(n => node.children!.some(c => c.id === n.id));
        if (childNodes.length > 0) {
             const minY = Math.min(...childNodes.map(n => n.y));
             const maxY = Math.max(...childNodes.map(n => n.y));
             currentY = (minY + maxY) / 2;
        }
      } else {
        currentY += VERTICAL_GAP;
      }
      newNodes.push({
        id: myId,
        x: level * LEVEL_GAP,
        y: currentY,
        label: node.label,
        level,
        parentId
      });
    };
    calculateLayout(treeData, 0);
    if (nodes.length === 0 && newNodes.length > 0 && containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        const treeMinY = Math.min(...newNodes.map(n => n.y));
        const treeMaxY = Math.max(...newNodes.map(n => n.y));
        const initialOffsetY = (bounds.height / 2) - (treeMinY + (treeMaxY - treeMinY) / 2);
        setOffset({ x: 100, y: initialOffsetY });
    }
    setNodes(newNodes);
  }, [treeData]);

  const handleExpand = async (e: React.MouseEvent, nodeLabel: string, nodeId: string) => {
      e.stopPropagation();
      if (expandingNodeId || !sources.length) return;
      setExpandingNodeId(nodeId);
      try {
          const newChildren = await expandMindMapNode(sources, nodeLabel);
          if (newChildren.length > 0) {
              const updateTree = (node: MindMapNode): MindMapNode => {
                  if (node.id === nodeId) {
                      return { ...node, children: [...(node.children || []), ...newChildren] };
                  }
                  if (node.children) {
                      return { ...node, children: node.children.map(updateTree) };
                  }
                  return node;
              };
              setTreeData(prev => prev ? updateTree(prev) : null);
          }
      } catch (err) {
          console.error("Expand failed", err);
      } finally {
          setExpandingNodeId(null);
      }
  };

  const handleInfo = async (e: React.MouseEvent, nodeLabel: string, nodeId: string, x: number, y: number) => {
      e.stopPropagation();
      if (describingNodeId || !sources.length) return;
      if (activeDescription?.id === nodeId) {
          setActiveDescription(null);
          return;
      }
      setDescribingNodeId(nodeId);
      try {
          const text = await fetchNodeDescription(sources, nodeLabel);
          setActiveDescription({
              id: nodeId,
              text,
              x: x + NODE_WIDTH + 20,
              y: y
          });
      } catch (err) {
          console.error("Info failed", err);
      } finally {
          setDescribingNodeId(null);
      }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, label: string) => {
      e.stopPropagation();
      if (onNodeDoubleClick) onNodeDoubleClick(label);
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 4);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     setIsPanning(true);
     setLastPanPoint({ x: e.clientX, y: e.clientY });
     setActiveDescription(null); 
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        const dx = e.clientX - lastPanPoint.x;
        const dy = e.clientY - lastPanPoint.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (draggingNodeId) {
        const dx = e.movementX / scale;
        const dy = e.movementY / scale;
        setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDraggingNodeId(id);
  };

  const getNodeColor = (level: number) => {
      if (level === 0) return 'bg-app-text/20 border-app-text';
      if (level === 1) return 'bg-app-card border-app-dim';
      return 'bg-app-panel border-app-border';
  };

  return (
    <div className="absolute inset-0 z-50 bg-app-bg/95 backdrop-blur-sm flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-app-border relative z-20 bg-app-panel">
         <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-500/10 rounded-lg">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
             </div>
             <h2 className="text-xl font-normal text-app-text">Mind Map</h2>
             <span className="text-xs text-app-dim bg-app-card px-2 py-1 rounded">Double-click node for details • Drag to stretch</span>
         </div>
         <div className="flex items-center gap-2">
            {onRefresh && (
                <button onClick={onRefresh} className="p-2 hover:bg-app-card rounded-full text-cyan-400 hover:text-cyan-300 transition" title="Regenerate Map">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-app-card rounded-full text-app-dim hover:text-app-text transition">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-app-bg cursor-move active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
         <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${offset.x}px ${offset.y}px`,
                backgroundImage: `radial-gradient(var(--c-border) 1px, transparent 1px)`
            }}
         />
         {!data ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-app-text">Generating Neural Structure...</p>
             </div>
         ) : (
             <div 
                className="absolute left-0 top-0 transition-transform duration-75 ease-out origin-top-left"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
                }}
             >
                <svg className="overflow-visible absolute top-0 left-0 w-1 h-1 pointer-events-none">
                    {nodes.map(node => {
                        if (!node.parentId) return null;
                        const parent = nodes.find(n => n.id === node.parentId);
                        if (!parent) return null;
                        const startX = parent.x + NODE_WIDTH;
                        const startY = parent.y + NODE_HEIGHT / 2;
                        const endX = node.x;
                        const endY = node.y + NODE_HEIGHT / 2;
                        const c1x = startX + (endX - startX) / 2;
                        const c1y = startY;
                        const c2x = endX - (endX - startX) / 2;
                        const c2y = endY;
                        return (
                            <path 
                                key={`link-${node.id}`}
                                d={`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`}
                                stroke="var(--c-border)" 
                                strokeWidth="2" 
                                fill="none" 
                                className="opacity-60"
                            />
                        );
                    })}
                </svg>
                {nodes.map(node => (
                    <div
                        key={node.id}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        onDoubleClick={(e) => handleNodeDoubleClick(e, node.label)}
                        className={`absolute flex items-center justify-center p-3 rounded-xl shadow-lg border cursor-grab active:cursor-grabbing group transition-all duration-200 ${getNodeColor(node.level)}`}
                        style={{
                            left: node.x,
                            top: node.y,
                            width: NODE_WIDTH,
                            minHeight: NODE_HEIGHT,
                        }}
                    >
                        <span className="text-center text-xs font-medium text-app-text leading-tight pointer-events-none">
                            {node.label}
                        </span>
                        <div className="absolute -top-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => handleExpand(e, node.label, node.id)}
                                disabled={!!expandingNodeId}
                                className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 shadow-md text-white"
                                title="Expand topics"
                            >
                                {expandingNodeId === node.id ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                )}
                            </button>
                            <button 
                                onClick={(e) => handleInfo(e, node.label, node.id, node.x, node.y)}
                                disabled={!!describingNodeId}
                                className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 shadow-md text-white"
                                title="Get Definition"
                            >
                                {describingNodeId === node.id ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="text-[10px] font-bold serif">i</span>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
                {activeDescription && (
                    <div 
                        className="absolute bg-app-card border border-app-border p-4 rounded-lg shadow-2xl w-64 text-sm text-app-text z-50 animate-fade-in"
                        style={{ left: activeDescription.x, top: activeDescription.y }}
                    >
                        <div className="flex justify-between items-start mb-2">
                             <h4 className="font-bold text-blue-400">Description</h4>
                             <button onClick={() => setActiveDescription(null)} className="text-app-dim hover:text-app-text">✕</button>
                        </div>
                        <p className="leading-relaxed text-xs">{activeDescription.text}</p>
                    </div>
                )}
             </div>
         )}
      </div>
    </div>
  );
};

export default MindMapViewer;
