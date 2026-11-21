import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, Crop as CropIcon, Grid, Download, Settings, Check, Image as ImageIcon, Archive, GripHorizontal, GripVertical, Move } from "lucide-react";
import { cn } from "../../utils";
import { getCroppedImg, sliceImage } from "../../imageUtils";
import JSZip from "jszip";
// The pre-bundled CommonJS module only exposes a default export (the saveAs function).
import FileSaver from 'file-saver';
const saveAs = FileSaver;

type Mode = "crop" | "carve";

export function ImageCarverTool() {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [mode, setMode] = useState<Mode>("crop");

  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const [completedPercentCrop, setCompletedPercentCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Carve State
  const [croppedImageSrc, setCroppedImageSrc] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(true);
  const [numRows, setNumRows] = useState(2);
  const [numCols, setNumCols] = useState(2);
  const [rowCuts, setRowCuts] = useState<number[]>([]);
  const [colCuts, setColCuts] = useState<number[]>([]);
  const [carveImageSize, setCarveImageSize] = useState({ width: 0, height: 0 });
  const [format, setFormat] = useState<"image/png" | "image/jpeg">("image/png");

  const [isProcessing, setIsProcessing] = useState(false);

  // Drag State for grid handles
  const carveImgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState<{ type: "row" | "col"; index: number } | null>(null);

  const updateCutFromPointer = useCallback(
    (clientX: number, clientY: number, drag: { type: "row" | "col"; index: number }) => {
      const img = carveImgRef.current;
      if (!img || carveImageSize.width === 0 || carveImageSize.height === 0) return;
      const rect = img.getBoundingClientRect();

      if (drag.type === "row") {
        const relY = (clientY - rect.top) / rect.height;
        const px = Math.round(Math.max(0, Math.min(1, relY)) * carveImageSize.height);
        setRowCuts((prev) => {
          const next = [...prev];
          next[drag.index] = px;
          return next;
        });
      } else {
        const relX = (clientX - rect.left) / rect.width;
        const px = Math.round(Math.max(0, Math.min(1, relX)) * carveImageSize.width);
        setColCuts((prev) => {
          const next = [...prev];
          next[drag.index] = px;
          return next;
        });
      }
    },
    [carveImageSize]
  );

  // Global pointer listeners while dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateCutFromPointer(e.clientX, e.clientY, dragging);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateCutFromPointer]);

  // Handle File Upload
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      setCompletedPercentCrop(null);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(file);
      setMode("crop");
      setCroppedImageSrc("");
    }
  };

  // Generate cropped image when switching to carve mode
  useEffect(() => {
    if (mode === "carve" && imageSrc) {
      if (completedPercentCrop && completedPercentCrop.width > 0 && completedPercentCrop.height > 0) {
        getCroppedImg(imageSrc, completedPercentCrop).then((url) => {
          setCroppedImageSrc(url);
        });
      } else {
        // If no crop was made, use the whole image
        setCroppedImageSrc(imageSrc);
      }
      setIsAdjusting(true);
    }
  }, [mode, imageSrc, completedPercentCrop]);

  // Initialize cuts when numRows/numCols or image size changes
  useEffect(() => {
    if (carveImageSize.width > 0 && carveImageSize.height > 0) {
      setRowCuts((prev) => {
        const newCuts = Array.from({ length: Math.max(0, numRows - 1) }, (_, i) => {
          return prev[i] !== undefined ? prev[i] : Math.round(((i + 1) * carveImageSize.height) / numRows);
        });
        return newCuts;
      });
      setColCuts((prev) => {
        const newCuts = Array.from({ length: Math.max(0, numCols - 1) }, (_, i) => {
          return prev[i] !== undefined ? prev[i] : Math.round(((i + 1) * carveImageSize.width) / numCols);
        });
        return newCuts;
      });
    }
  }, [numRows, numCols, carveImageSize]);

  const handleDownload = async () => {
    if (!croppedImageSrc) return;
    setIsProcessing(true);
    try {
      const slices = await sliceImage(croppedImageSrc, rowCuts, colCuts, format);
      
      if (slices.length === 0) return;

      if (slices.length === 1) {
        // Single file download
        const a = document.createElement("a");
        a.href = slices[0].url;
        a.download = slices[0].name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Multiple files: Bundle into a ZIP to prevent browser blocking
        const zip = new JSZip();
        slices.forEach((slice) => {
          // slice.url is a data URL: data:image/png;base64,iVBORw0KGgo...
          const base64Data = slice.url.split(",")[1];
          zip.file(slice.name, base64Data, { base64: true });
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "carved-slices.zip");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 text-slate-200 font-sans selection:bg-sky-500/30 selection:text-sky-200 p-4">
      
      {/* Main Content */}
      {imageSrc ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-300">
          
          {/* Controls Panel - Left/Top */}
          <aside className="lg:col-span-3 space-y-4">
            
            {/* Mode Switcher */}
            <div className="bg-slate-800 p-1 rounded-md border border-slate-700 flex shadow-sm">
              <button
                onClick={() => setMode("crop")}
                className={cn(
                  "flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 rounded text-xs font-medium transition-all border",
                  mode === "crop"
                    ? "bg-slate-700 text-sky-400 shadow-sm border-slate-600"
                    : "text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300"
                )}
              >
                <CropIcon className="w-3.5 h-3.5" />
                Crop Area
              </button>
              <button
                onClick={() => setMode("carve")}
                className={cn(
                  "flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 rounded text-xs font-medium transition-all border",
                  mode === "carve"
                    ? "bg-slate-700 text-sky-400 shadow-sm border-slate-600"
                    : "text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300"
                )}
              >
                <Grid className="w-3.5 h-3.5" />
                Grid Splitting
              </button>
            </div>

            {/* Crop Controls */}
            {mode === "crop" && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm space-y-3 animate-in slide-in-from-left-2 duration-300">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CropIcon className="w-3.5 h-3.5 text-sky-400" />
                  Crop Image
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select the specific region to be carved. Drag the edges to fine-tune selection.
                </p>
                <button
                  onClick={() => setMode("carve")}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white py-1.5 rounded font-medium transition-colors border border-sky-500 flex items-center justify-center gap-1.5 text-xs shadow-sm mt-2"
                >
                  Confirm Crop & Next
                </button>
              </div>
            )}

            {/* Carve Controls */}
            {mode === "carve" && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm space-y-4 animate-in slide-in-from-right-2 duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-sky-400" />
                    Grid Configuration
                  </h2>
                  <button
                    onClick={() => setIsAdjusting(!isAdjusting)}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-1 rounded transition-colors border",
                      isAdjusting 
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20" 
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    )}
                  >
                    {isAdjusting ? "Lock Grid" : "Edit Details"}
                  </button>
                </div>

                {isAdjusting ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Rows</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={numRows}
                          onChange={(e) => setNumRows(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-shadow"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Columns</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={numCols}
                          onChange={(e) => setNumCols(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-shadow"
                        />
                      </div>
                    </div>

                    <div className="bg-sky-500/5 border border-sky-500/20 rounded px-2 py-1.5 flex items-start gap-1.5">
                      <Move className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Drag the <span className="text-sky-400 font-semibold">grid handles</span> on the image, or type exact pixel values below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900/60 rounded-md p-2.5 border border-slate-700 flex items-center justify-between shadow-inner">
                      <div className="flex gap-3">
                        <div className="text-center">
                          <span className="block text-lg font-bold text-slate-200 leading-none">{numRows}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Rows</span>
                        </div>
                        <div className="w-px bg-slate-700"></div>
                        <div className="text-center">
                          <span className="block text-lg font-bold text-slate-200 leading-none">{numCols}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Cols</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-base font-bold text-sky-400 leading-none">{numRows * numCols}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Slices</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setFormat("image/png")}
                          className={cn(
                            "py-1.5 px-2 rounded border text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                            format === "image/png"
                              ? "bg-sky-500/10 border-sky-500 text-sky-400"
                              : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                          )}
                        >
                          PNG
                          {format === "image/png" && <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setFormat("image/jpeg")}
                          className={cn(
                            "py-1.5 px-2 rounded border text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                            format === "image/jpeg"
                              ? "bg-sky-500/10 border-sky-500 text-sky-400"
                              : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                          )}
                        >
                          JPEG
                          {format === "image/jpeg" && <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      disabled={isProcessing}
                      className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:border-slate-600 text-white py-2 rounded font-bold transition-colors border border-sky-500 flex items-center justify-center gap-2 shadow-sm text-xs mt-2"
                    >
                      {isProcessing ? (
                        <span className="animate-pulse">Packaging ZIP...</span>
                      ) : (
                        <>
                          {numRows * numCols > 1 ? <Archive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          Download {numRows * numCols > 1 ? "ZIP" : "Slice"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Workspace Area - Right/Bottom */}
          <section className="lg:col-span-9 h-full">
            <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-sm overflow-hidden flex flex-col h-[70vh] min-h-[500px]">
              {/* Workspace Header */}
              <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Workspace preview
                </span>
                {mode === "carve" && carveImageSize.width > 0 && (
                  <span className="text-[10px] font-mono text-sky-400/80 font-medium bg-sky-400/10 px-1.5 py-0.5 rounded">
                    {carveImageSize.width} × {carveImageSize.height} px
                  </span>
                )}
              </div>

              {/* Workspace Content */}
              <div className="p-4 flex-1 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUxZTI4IiAvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUxZTI4IiAvPgo8L3N2Zz4=')] overflow-hidden">
                
                {mode === "crop" && (
                  <div className="max-w-full max-h-full flex items-center justify-center overflow-hidden border border-slate-700 shadow-xl bg-slate-900">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(_, pc) => setCompletedPercentCrop(pc)}
                      className="max-h-[calc(70vh-80px)]"
                    >
                      <img
                        ref={imgRef}
                        alt="Upload"
                        src={imageSrc}
                        className="max-w-full max-h-[calc(70vh-80px)] object-contain"
                      />
                    </ReactCrop>
                  </div>
                )}

                {mode === "carve" && croppedImageSrc && (
                  <div
                    className={cn(
                      "relative max-w-full flex items-center justify-center border border-slate-700 shadow-2xl bg-slate-900 inline-block overflow-hidden select-none",
                      dragging && "cursor-grabbing"
                    )}
                  >
                    <img
                      ref={carveImgRef}
                      src={croppedImageSrc}
                      alt="Cropped"
                      className="max-w-full max-h-[calc(70vh-80px)] block pointer-events-none"
                      draggable={false}
                      onLoad={(e) => {
                        setCarveImageSize({
                          width: e.currentTarget.naturalWidth,
                          height: e.currentTarget.naturalHeight,
                        });
                      }}
                    />
                    
                    {/* Render Grid Lines */}
                    {carveImageSize.width > 0 && carveImageSize.height > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="relative w-full h-full">
                          {/* Row Cuts */}
                          {rowCuts.map((cutY, idx) => {
                            const isActive = dragging?.type === "row" && dragging.index === idx;
                            return (
                              <div
                                key={`line-r-${idx}`}
                                className={cn(
                                  "absolute left-0 right-0 z-10 group",
                                  isAdjusting && "pointer-events-auto cursor-row-resize"
                                )}
                                style={{ top: `${(cutY / carveImageSize.height) * 100}%` }}
                                onPointerDown={
                                  isAdjusting
                                    ? (e) => {
                                        e.preventDefault();
                                        setDragging({ type: "row", index: idx });
                                      }
                                    : undefined
                                }
                              >
                                {/* Visible line */}
                                <div
                                  className={cn(
                                    "absolute left-0 right-0 border-t-[6px] border-slate-950 shadow-[0_0_12px_rgba(0,0,0,0.8)] -mt-[3px]",
                                    isActive && "border-slate-900"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute inset-0 border-t-2 -mt-1",
                                      isActive ? "border-sky-300" : "border-sky-400/80",
                                      isAdjusting && "group-hover:border-sky-300"
                                    )}
                                  ></div>
                                </div>
                                {/* Drag handle */}
                                {isAdjusting && (
                                  <div
                                    className={cn(
                                      "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-5 rounded-full border-2 shadow-lg transition-colors",
                                      isActive
                                        ? "bg-sky-400 border-sky-200 scale-110"
                                        : "bg-slate-950 border-sky-400 group-hover:bg-sky-500 group-hover:border-sky-300"
                                    )}
                                  >
                                    <GripHorizontal className={cn("w-3.5 h-3.5", isActive ? "text-slate-950" : "text-sky-400 group-hover:text-slate-950")} />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Col Cuts */}
                          {colCuts.map((cutX, idx) => {
                            const isActive = dragging?.type === "col" && dragging.index === idx;
                            return (
                              <div
                                key={`line-c-${idx}`}
                                className={cn(
                                  "absolute top-0 bottom-0 z-10 group",
                                  isAdjusting && "pointer-events-auto cursor-col-resize"
                                )}
                                style={{ left: `${(cutX / carveImageSize.width) * 100}%` }}
                                onPointerDown={
                                  isAdjusting
                                    ? (e) => {
                                        e.preventDefault();
                                        setDragging({ type: "col", index: idx });
                                      }
                                    : undefined
                                }
                              >
                                {/* Visible line */}
                                <div
                                  className={cn(
                                    "absolute top-0 bottom-0 border-l-[6px] border-slate-950 shadow-[0_0_12px_rgba(0,0,0,0.8)] -ml-[3px]",
                                    isActive && "border-slate-900"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute inset-0 border-l-2 -ml-1",
                                      isActive ? "border-sky-300" : "border-sky-400/80",
                                      isAdjusting && "group-hover:border-sky-300"
                                    )}
                                  ></div>
                                </div>
                                {/* Drag handle */}
                                {isAdjusting && (
                                  <div
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-5 h-9 rounded-full border-2 shadow-lg transition-colors",
                                      isActive
                                        ? "bg-sky-400 border-sky-200 scale-110"
                                        : "bg-slate-950 border-sky-400 group-hover:bg-sky-500 group-hover:border-sky-300"
                                    )}
                                  >
                                    <GripVertical className={cn("w-3.5 h-3.5", isActive ? "text-slate-950" : "text-sky-400 group-hover:text-slate-950")} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Empty State */
        <div className="h-full flex items-center justify-center">
            <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all border border-sky-500 flex items-center justify-center gap-2 shadow-lg hover:shadow-sky-500/20 group text-sm">
              <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Select Image to Begin
              <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
            </label>
        </div>
      )}
    </div>
  );
}
