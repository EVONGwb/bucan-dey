import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Camera,
  ChevronLeft,
  Globe2,
  Hash,
  Image as ImageIcon,
  Loader2,
  LocateFixed,
  MapPin,
  Send,
  Smile,
  Sparkles,
  Trash2,
  Type,
  Users,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client.js";
import { getApiErrorMessage } from "../utils/errors.js";
import { MEDIA_UPLOAD_TIMEOUT_MS, getMediaValidationError } from "../utils/uploads.js";

const initialForm = {
  text: "",
  visibility: "global",
  city: "",
  area: "",
  lat: "",
  lng: "",
  show_on_map: false,
};

const storyVisibilityOptions = [
  { value: "global", label: "Global", icon: Globe2 },
  { value: "followers", label: "Seguidores", icon: Users },
];

const quickEmojis = ["🔥", "🎉", "😂", "😍", "😎", "🥳", "❤️", "💃", "🕺", "🍾", "🎶", "📍"];

const storyTemplates = [
  "Ahora mismo en Malabo...",
  "¿Quién viene?",
  "Plan de hoy:",
  "Nos vemos en...",
  "Esto está pasando ahora",
  "BUCAN DEY activo",
];

const storyStickers = [
  { id: "bucan", label: "BUCAN DEY", value: "BUCAN DEY", className: "from-neonPink to-fiestaPurple text-white" },
  { id: "fiesta", label: "Fiesta", value: "🎉 Fiesta", className: "from-neonYellow to-neonPink text-night" },
  { id: "noche", label: "Noche", value: "🌙 Noche", className: "from-fiestaPurple to-neonCyan text-white" },
  { id: "live", label: "En vivo", value: "🔴 En vivo", className: "from-liveRed to-neonPink text-white" },
  { id: "mira", label: "Mira esto", value: "👀 Mira esto", className: "from-neonCyan to-blue-500 text-night" },
  { id: "music", label: "Sonando", value: "🎶 Sonando ahora", className: "from-neonPink to-neonCyan text-white" },
];

const storyFilters = [
  { id: "normal", label: "Normal", className: "" },
  { id: "neon", label: "Neon", className: "saturate-150 contrast-125 brightness-110" },
  { id: "night", label: "Noche", className: "brightness-75 contrast-125 saturate-125" },
  { id: "pink", label: "Pink", className: "hue-rotate-30 saturate-150 contrast-110" },
  { id: "cyan", label: "Cyan", className: "hue-rotate-180 saturate-150 brightness-110" },
  { id: "mono", label: "B/N", className: "grayscale contrast-125" },
];

const textSizes = [
  { id: "sm", label: "S", className: "text-lg" },
  { id: "md", label: "M", className: "text-2xl" },
  { id: "lg", label: "L", className: "text-3xl" },
];

const textColors = [
  { id: "white", label: "Blanco", className: "text-white", swatch: "bg-white" },
  { id: "pink", label: "Pink", className: "text-neonPink", swatch: "bg-neonPink" },
  { id: "cyan", label: "Cyan", className: "text-neonCyan", swatch: "bg-neonCyan" },
  { id: "yellow", label: "Oro", className: "text-neonYellow", swatch: "bg-neonYellow" },
];

const textBackgrounds = [
  { id: "dark", label: "Oscuro", className: "bg-black/34 backdrop-blur-md" },
  { id: "none", label: "Sin fondo", className: "" },
  { id: "pink", label: "Neón", className: "bg-neonPink/18 backdrop-blur-md" },
];

const textPositions = [
  { id: "top", label: "Arriba", className: "top-[18%]" },
  { id: "middle", label: "Centro", className: "top-[36%]" },
  { id: "bottom", label: "Abajo", className: "bottom-32" },
];

const storyEditorTools = [
  { id: "texto", label: "Texto", icon: Type },
  { id: "emoji", label: "Emoji", icon: Smile },
  { id: "stickers", label: "Stickers", icon: Sparkles },
  { id: "filtros", label: "Filtros", icon: Wand2 },
  { id: "hashtags", label: "Hashtags", icon: Hash },
  { id: "ubicacion", label: "Ubicación", icon: MapPin },
];

const TRASH_ZONE_HEIGHT_PERCENT = 3;
const quickTags = ["#Malabo", "#Fiesta", "#Ambiente", "#BUCANDEY", "#Cumple", "#Bar", "@amigos", "@familia"];

function CreateStory() {
  const navigate = useNavigate();
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const storyStageRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [media, setMedia] = useState(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [selectedStoryElementId, setSelectedStoryElementId] = useState("");
  const [storyElements, setStoryElements] = useState([]);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [activeTool, setActiveTool] = useState("texto");
  const [tagInput, setTagInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(storyFilters[0]);
  const [stickers, setStickers] = useState([]);
  const [textStyle, setTextStyle] = useState({
    size: "md",
    color: "white",
    background: "dark",
    align: "center",
    position: "middle",
    glow: true,
  });

  useEffect(() => {
    if (!showCamera || !cameraStream || !cameraVideoRef.current) return;

    cameraVideoRef.current.srcObject = cameraStream;
    cameraVideoRef.current.play().catch(() => {
      setCameraError("No se pudo iniciar la vista de cámara.");
    });
  }, [showCamera, cameraStream]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateTextStyle(name, value) {
    setTextStyle((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function appendToText(value) {
    const nextElement = {
      id: `element-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "emoji",
      value,
      x: `${38 + (storyElements.length % 3) * 12}%`,
      y: `${48 + (storyElements.length % 4) * 8}%`,
      className: "text-3xl",
    };
    setStoryElements((current) => [...current, nextElement].slice(-12));
    setSelectedStoryElementId(nextElement.id);
  }

  function applyTemplate(value) {
    setForm((current) => ({
      ...current,
      text: current.text ? `${value} ${current.text}`.slice(0, 300) : value,
    }));
    setShowTextEditor(true);
    setActiveTool("texto");
  }

  function addTagElement(rawValue) {
    const cleanValue = rawValue.trim().replace(/\s+/g, "");
    if (!cleanValue) return;

    const value = cleanValue.startsWith("#") || cleanValue.startsWith("@") ? cleanValue : `#${cleanValue}`;
    const nextElement = {
      id: `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "tag",
      value,
      x: `${16 + (storyElements.length % 4) * 14}%`,
      y: `${38 + (storyElements.length % 4) * 9}%`,
      className: "from-neonCyan to-neonPink text-white",
    };

    setStoryElements((current) => [...current, nextElement].slice(-12));
    setSelectedStoryElementId(nextElement.id);
    setForm((current) => {
      const nextText = `${current.text}${current.text ? " " : ""}${value}`.slice(0, 300);
      return { ...current, text: nextText };
    });
    setTagInput("");
  }

  function toggleSticker(sticker) {
    setStickers((current) => {
      if (current.some((item) => item.id === sticker.id)) {
        return current.filter((item) => item.id !== sticker.id);
      }

      return [...current, sticker].slice(-4);
    });
    setStoryElements((current) => {
      if (current.some((item) => item.sourceId === sticker.id)) {
        return current.filter((item) => item.sourceId !== sticker.id);
      }

      const nextElement = {
        id: `sticker-${sticker.id}-${Date.now()}`,
        sourceId: sticker.id,
        type: "sticker",
        value: sticker.value,
        x: `${18 + (current.length % 4) * 15}%`,
        y: `${54 + (current.length % 3) * 9}%`,
        className: sticker.className,
      };
      setSelectedStoryElementId(nextElement.id);
      return [...current, nextElement].slice(-12);
    });
  }

  function getComposedStoryText() {
    const elementText = storyElements.map((element) => element.value).join(" ");
    const locationText = form.show_on_map && form.city ? `📍 ${form.city}${form.area ? ` · ${form.area}` : ""}` : "";
    return [form.text, elementText, locationText].filter(Boolean).join(" ").slice(0, 300);
  }

  async function uploadMediaFile(file) {
    const validationError = getMediaValidationError(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setError("");
      setUploadError("");
      setUploadProgress(0);
      setIsUploading(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: MEDIA_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.min(95, Math.round((progressEvent.loaded * 100) / progressEvent.total)));
        },
      });
      setUploadProgress(100);
      setMedia(response.data);
      setShowTextEditor(true);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleMediaSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    await uploadMediaFile(file);
  }

  function stopDeviceCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setShowCamera(false);
    setIsCameraStarting(false);
  }

  async function startDeviceCamera(nextFacingMode = cameraFacingMode) {
    setError("");
    setUploadError("");
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este navegador no permite usar la cámara desde aquí.");
      setShowCamera(true);
      return;
    }

    try {
      setShowCamera(true);
      setIsCameraStarting(true);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraFacingMode(nextFacingMode);
    } catch {
      setCameraError("No se pudo abrir la cámara. Revisa permisos del navegador.");
    } finally {
      setIsCameraStarting(false);
    }
  }

  async function handleSwitchCamera() {
    const nextFacingMode = cameraFacingMode === "environment" ? "user" : "environment";
    await startDeviceCamera(nextFacingMode);
  }

  async function handleCapturePhoto() {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("La cámara todavía no está lista.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError("No se pudo capturar la foto.");
        return;
      }

      const file = new File([blob], `bucan-story-${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadMediaFile(file);
      stopDeviceCamera();
    }, "image/jpeg", 0.92);
  }

  function handleUseCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite obtener ubicación.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          lat: Number(position.coords.latitude).toFixed(6),
          lng: Number(position.coords.longitude).toFixed(6),
          show_on_map: true,
        }));
        setShowLocationEditor(true);
        setIsLocating(false);
      },
      () => {
        setLocationError("No se pudo obtener tu ubicación.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  function handleRemoveMedia() {
    setMedia(null);
    setUploadError("");
    setUploadProgress(0);
    setShowTextEditor(false);
    setSelectedStoryElementId("");
    setStoryElements([]);
  }

  function isPointOverTrash(info) {
    const bounds = storyStageRef.current?.getBoundingClientRect();
    if (!bounds) return false;

    const trashZoneTop = bounds.bottom - bounds.height * (TRASH_ZONE_HEIGHT_PERCENT / 100);
    return (
      info.point.y >= trashZoneTop &&
      info.point.y <= bounds.bottom &&
      info.point.x >= bounds.left &&
      info.point.x <= bounds.right
    );
  }

  function handleTextDragEnd(_event, info) {
    setIsDraggingText(false);
    if (isPointOverTrash(info)) {
      setForm((current) => ({ ...current, text: "" }));
      setSelectedStoryElementId("");
    }
  }

  function handleStoryElementDragEnd(elementId, _event, info) {
    setIsDraggingText(false);
    if (isPointOverTrash(info)) {
      const removedElement = storyElements.find((element) => element.id === elementId);
      setStoryElements((current) => current.filter((element) => element.id !== elementId));
      if (removedElement?.sourceId) {
        setStickers((current) => current.filter((sticker) => sticker.id !== removedElement.sourceId));
      }
      setSelectedStoryElementId("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!media) {
      setError("Sube una imagen o vídeo para tu story.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      const response = await apiClient.post("/stories", {
        media,
        text: getComposedStoryText(),
        visibility: form.visibility,
        location: {
          city: form.city,
          area: form.area,
          lat: form.show_on_map && form.lat !== "" ? Number(form.lat) : null,
          lng: form.show_on_map && form.lng !== "" ? Number(form.lng) : null,
          show_on_map: form.show_on_map,
        },
      });
      navigate(`/stories/${response.data.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeTextSize = textSizes.find((item) => item.id === textStyle.size) || textSizes[1];
  const activeTextColor = textColors.find((item) => item.id === textStyle.color) || textColors[0];
  const textAlignClass =
    textStyle.align === "left" ? "text-left" : textStyle.align === "right" ? "text-right" : "text-center";
  const textOverlayPosition = {
    top: textStyle.position === "top" ? "18%" : textStyle.position === "bottom" ? "72%" : "46%",
    left: textStyle.align === "left" ? "12%" : textStyle.align === "right" ? "88%" : "50%",
    translate: textStyle.align === "left" ? "0 0" : textStyle.align === "right" ? "-100% 0" : "-50% 0",
  };
  const textOverlayClass = [
    "absolute z-10 inline-block w-fit max-w-[78%] cursor-grab touch-none select-none whitespace-pre-wrap break-words bg-transparent px-0 py-0 font-black leading-tight active:cursor-grabbing",
    activeTextSize.className,
    activeTextColor.className,
    textAlignClass,
    textStyle.glow ? "drop-shadow-[0_0_16px_rgba(255,79,216,.72)]" : "drop-shadow-[0_3px_14px_rgba(0,0,0,.85)]",
  ]
    .filter(Boolean)
    .join(" ");

  const activeToolMeta = storyEditorTools.find((tool) => tool.id === activeTool);

  function toggleActiveTool(toolId) {
    setActiveTool((current) => (current === toolId ? "" : toolId));
  }

  function renderEditorToolPanel() {
    if (!media || !activeToolMeta) return null;
    const ActiveToolIcon = activeToolMeta.icon;

    return (
      <motion.div
        className="absolute right-[3.75rem] top-3 z-20 max-h-[calc(100%-1.5rem)] w-[min(12.25rem,calc(100%-4.75rem))] overflow-y-auto rounded-2xl border border-white/10 bg-black/58 p-1.5 shadow-[0_0_34px_rgba(0,217,255,.18)] backdrop-blur-2xl scrollbar-none sm:right-[4.25rem] sm:top-4 sm:w-[15.5rem] sm:rounded-[1.35rem] sm:p-2"
        initial={{ opacity: 0, x: 14, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-neonCyan sm:text-[10px]">
            <ActiveToolIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {activeToolMeta.label}
          </span>
          <button
            className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/8 text-white/72 active:scale-95 sm:h-7 sm:w-7"
            type="button"
            onClick={() => setActiveTool("")}
            aria-label="Cerrar herramientas"
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>

        {activeTool === "texto" ? (
          <div className="space-y-1.5 sm:space-y-2">
            <textarea
              className="min-h-14 w-full resize-none rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 text-xs font-bold text-white outline-none placeholder:text-white/44 focus:border-neonPink sm:min-h-20 sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm"
              name="text"
              value={form.text}
              onChange={updateField}
              placeholder="Texto..."
              maxLength={300}
            />
            <div className="grid grid-cols-3 gap-1">
              {textSizes.map((size) => (
                <button
                  className={`h-7 rounded-xl border text-[10px] font-black sm:h-8 sm:text-xs ${textStyle.size === size.id ? "border-neonPink bg-neonPink/18 text-white" : "border-white/10 bg-white/8 text-white/62"}`}
                  key={size.id}
                  type="button"
                  onClick={() => updateTextStyle("size", size.id)}
                >
                  {size.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {textColors.map((color) => (
                <button
                  className={`h-7 flex-1 rounded-xl border text-[10px] font-black sm:h-8 ${textStyle.color === color.id ? "border-neonPink bg-white/14" : "border-white/10 bg-white/8"}`}
                  key={color.id}
                  type="button"
                  onClick={() => updateTextStyle("color", color.id)}
                  aria-label={color.label}
                >
                  <span className={`mx-auto block h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${color.swatch}`} />
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {textBackgrounds.map((background) => (
                <button
                  className={`h-7 rounded-xl border text-[9px] font-black sm:h-8 sm:text-[10px] ${textStyle.background === background.id ? "border-neonPink bg-neonPink/18 text-white" : "border-white/10 bg-white/8 text-white/62"}`}
                  key={background.id}
                  type="button"
                  onClick={() => updateTextStyle("background", background.id)}
                >
                  {background.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "left", icon: AlignLeft, label: "Izq" },
                { id: "center", icon: AlignCenter, label: "Centro" },
                { id: "right", icon: AlignRight, label: "Der" },
                { id: "glow", icon: Sparkles, label: "Glow" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = item.id === "glow" ? textStyle.glow : textStyle.align === item.id;
                return (
                  <button
                    className={`inline-flex h-7 items-center justify-center gap-0.5 rounded-xl border text-[8px] font-black sm:h-8 sm:gap-1 sm:text-[9px] ${isActive ? "border-neonCyan bg-neonCyan/14 text-white" : "border-white/10 bg-white/8 text-white/62"}`}
                    key={item.id}
                    type="button"
                    onClick={() => item.id === "glow" ? updateTextStyle("glow", !textStyle.glow) : updateTextStyle("align", item.id)}
                  >
                    <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {textPositions.map((position) => (
                <button
                  className={`h-7 rounded-xl border text-[9px] font-black sm:h-8 sm:text-[10px] ${textStyle.position === position.id ? "border-neonPink bg-neonPink/18 text-white" : "border-white/10 bg-white/8 text-white/62"}`}
                  key={position.id}
                  type="button"
                  onClick={() => updateTextStyle("position", position.id)}
                >
                  {position.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeTool === "emoji" ? (
          <div className="grid grid-cols-4 gap-1.5">
            {quickEmojis.map((emoji) => (
              <button
                className="grid h-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg shadow-cyan active:scale-95"
                key={emoji}
                type="button"
                onClick={() => appendToText(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        {activeTool === "stickers" ? (
          <div className="grid gap-1.5">
            {storyStickers.map((sticker) => {
              const isActive = stickers.some((item) => item.id === sticker.id);
              return (
                <button
                  className={`rounded-2xl border px-3 py-2 text-left text-[11px] font-black transition active:scale-95 ${
                    isActive ? "border-neonPink bg-neonPink/16 text-white shadow-neon" : "border-white/10 bg-white/8 text-white/72"
                  }`}
                  key={sticker.id}
                  type="button"
                  onClick={() => toggleSticker(sticker)}
                >
                  {sticker.value}
                </button>
              );
            })}
          </div>
        ) : null}

        {activeTool === "filtros" ? (
          <div className="grid grid-cols-2 gap-1.5">
            {storyFilters.map((filter) => (
              <button
                className={`grid h-14 place-items-center rounded-2xl border text-[10px] font-black transition active:scale-95 ${
                  selectedFilter.id === filter.id ? "border-neonPink bg-neonPink/18 text-white shadow-neon" : "border-white/10 bg-white/8 text-white/62"
                }`}
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter)}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan ${filter.className}`} />
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}

        {activeTool === "hashtags" ? (
          <div className="space-y-2">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-2">
              <input
                className="h-9 w-full rounded-xl border border-white/10 bg-black/22 px-3 text-xs font-black text-white outline-none placeholder:text-white/40 focus:border-neonCyan"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTagElement(tagInput);
                  }
                }}
                placeholder="#tema o @usuario"
              />
              <button
                className="mt-1.5 h-8 w-full rounded-xl bg-gradient-to-r from-neonCyan to-neonPink text-[10px] font-black text-night shadow-neon active:scale-95"
                type="button"
                onClick={() => addTagElement(tagInput)}
              >
                Añadir
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickTags.map((tag) => (
                <button
                  className="rounded-2xl border border-white/10 bg-white/8 px-2 py-2 text-left text-[10px] font-black text-white/72 transition active:scale-95"
                  key={tag}
                  type="button"
                  onClick={() => addTagElement(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeTool === "ubicacion" ? (
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-white/78">
              Mostrar en mapa
              <input
                type="checkbox"
                name="show_on_map"
                checked={form.show_on_map}
                onChange={updateField}
              />
            </label>
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-neonGreen/25 bg-neonGreen/12 px-3 text-xs font-black text-neonGreen active:scale-95"
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {isLocating ? "Buscando ubicación" : "Usar mi ubicación"}
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-white/36 focus:border-neonPink"
                name="city"
                value={form.city}
                onChange={updateField}
                placeholder="Ciudad"
              />
              <input
                className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-white/36 focus:border-neonPink"
                name="area"
                value={form.area}
                onChange={updateField}
                placeholder="Zona"
              />
            </div>
            {locationError ? <p className="text-xs font-bold text-neonPink">{locationError}</p> : null}
          </div>
        ) : null}
      </motion.div>
    );
  }

  return (
    <section className="-mx-4 -mt-5 min-h-screen overflow-y-auto bg-night text-white">
      <form className="relative min-h-screen pb-[calc(env(safe-area-inset-bottom)+6.5rem)]" onSubmit={handleSubmit}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,79,216,.34),transparent_18rem),radial-gradient(circle_at_82%_5%,rgba(0,217,255,.22),transparent_18rem),linear-gradient(180deg,rgba(15,23,42,.84),#070B14_58%)]" />

        <header className="relative z-20 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white shadow-cyan backdrop-blur-xl"
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Cerrar crear story"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neonGreen">Story 24h</p>
            <h1 className="text-lg font-black">Crear historia</h1>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white shadow-neon backdrop-blur-xl"
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <input
          ref={galleryInputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          onChange={handleMediaSelect}
        />
        <input
          ref={cameraInputRef}
          className="sr-only"
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={handleMediaSelect}
        />

        <main className="relative z-10 mx-auto mt-4 flex w-full max-w-md flex-col px-4 sm:max-w-2xl">
          <motion.section
            ref={storyStageRef}
            className="relative h-[min(68vh,38rem)] min-h-[31rem] overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-[0_0_45px_rgba(0,217,255,.14)]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onPointerDown={() => {
              setSelectedStoryElementId("");
              setActiveTool("");
            }}
          >
            {media ? (
              <>
                {media.type === "image" ? (
                  <img
                    alt="Preview story"
                    className={`h-full w-full object-cover ${selectedFilter.className}`}
                    src={media.url}
                  />
                ) : (
                  <video
                    className={`h-full w-full bg-black object-contain ${selectedFilter.className}`}
                    controls
                    playsInline
                    preload="metadata"
                    src={media.url}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/52 via-transparent to-black/78" />

	                {form.text ? (
	                  <motion.p
	                    drag
	                    dragConstraints={storyStageRef}
	                    dragElastic={0.08}
		                    dragMomentum={false}
		                    style={textOverlayPosition}
		                    initial={{ opacity: 0, scale: 0.94 }}
	                    animate={{ opacity: 1, scale: 1 }}
	                    whileDrag={{ scale: 1.05 }}
	                    onPointerDown={(event) => {
	                      event.stopPropagation();
	                      setSelectedStoryElementId("main-text");
	                    }}
	                    onDragStart={() => {
	                      setSelectedStoryElementId("main-text");
	                      setIsDraggingText(true);
	                    }}
	                    onDragEnd={handleTextDragEnd}
	                    className={`${textOverlayClass} ${
	                      selectedStoryElementId === "main-text"
	                        ? "rounded-2xl outline outline-2 outline-neonCyan/85 outline-offset-2"
	                        : ""
	                    }`}
	                  >
	                    {form.text}
	                  </motion.p>
	                ) : null}

	                {storyElements.map((element) => (
	                  <motion.button
		                    className={`absolute z-10 inline-flex w-fit cursor-grab touch-none select-none items-center justify-center bg-transparent px-0 py-0 font-black leading-none drop-shadow-[0_0_15px_rgba(255,79,216,.72)] active:cursor-grabbing ${
		                      element.type === "emoji"
		                        ? element.className
		                        : `rounded-full bg-gradient-to-r px-3 py-1.5 text-xs shadow-neon ${element.className}`
		                    } ${
	                      selectedStoryElementId === element.id
	                        ? "outline outline-2 outline-neonCyan/85 outline-offset-2"
	                        : ""
	                    }`}
	                    key={element.id}
	                    type="button"
	                    drag
	                    dragConstraints={storyStageRef}
	                    dragElastic={0.08}
	                    dragMomentum={false}
	                    style={{ left: element.x, top: element.y }}
	                    initial={{ opacity: 0, scale: 0.9 }}
	                    animate={{ opacity: 1, scale: 1 }}
	                    whileDrag={{ scale: 1.08 }}
	                    onPointerDown={(event) => {
	                      event.stopPropagation();
	                      setSelectedStoryElementId(element.id);
	                    }}
	                    onDragStart={() => {
	                      setSelectedStoryElementId(element.id);
	                      setIsDraggingText(true);
	                    }}
	                    onDragEnd={(event, info) => handleStoryElementDragEnd(element.id, event, info)}
	                    aria-label={`Mover ${element.value}`}
	                  >
	                    {element.value}
	                  </motion.button>
	                ))}

                <div className="absolute left-4 top-4 flex max-w-[72%] flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/42 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur-xl">
                    {form.visibility === "global" ? <Globe2 className="h-3.5 w-3.5 text-neonCyan" /> : <Users className="h-3.5 w-3.5 text-neonPink" />}
                    {form.visibility === "global" ? "Global" : "Seguidores"}
                  </span>
                  {form.show_on_map ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-neonPink/20 bg-neonPink/18 px-3 py-1.5 text-[10px] font-black backdrop-blur-xl">
                      <MapPin className="h-3.5 w-3.5" />
                      {form.city || "Mapa"}
                    </span>
                  ) : null}
                </div>

                <div
                  className="absolute right-3 top-4 z-30 grid gap-2"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {storyEditorTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        className={`grid h-10 w-10 place-items-center rounded-full border text-white backdrop-blur-xl transition active:scale-95 ${
                          isActive
                            ? "border-neonPink bg-neonPink/24 shadow-neon"
                            : "border-white/10 bg-black/42 shadow-cyan"
                        }`}
                        key={tool.id}
                        type="button"
                        onClick={() => toggleActiveTool(tool.id)}
                        aria-label={tool.label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-liveRed/20 bg-liveRed/18 text-white shadow-live backdrop-blur-xl active:scale-95"
                    type="button"
                    onClick={handleRemoveMedia}
                    aria-label="Quitar archivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {renderEditorToolPanel()}

	                {isDraggingText ? (
		                  <motion.div
		                    className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-center bg-gradient-to-t from-liveRed/42 via-liveRed/16 to-transparent px-5 pb-3 text-[11px] font-black text-white shadow-live backdrop-blur-[1.5px]"
		                    style={{ height: `${TRASH_ZONE_HEIGHT_PERCENT}%` }}
	                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/42 px-4 py-2 shadow-live backdrop-blur-2xl">
                      <Trash2 className="h-3.5 w-3.5 text-liveRed" />
                      Suelta aquí para borrar
                    </div>
                  </motion.div>
                ) : null}
              </>
            ) : showCamera ? (
              <div className="relative h-full w-full overflow-hidden bg-black">
                <video
                  ref={cameraVideoRef}
                  className={`h-full w-full object-cover ${cameraFacingMode === "user" ? "-scale-x-100" : ""}`}
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={cameraCanvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/42 via-transparent to-black/72" />

                <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/46 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-xl">
                  Cámara {cameraFacingMode === "user" ? "frontal" : "trasera"}
                </div>

                {isCameraStarting ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/32 text-white">
                    <Loader2 className="h-10 w-10 animate-spin text-neonCyan" />
                  </div>
                ) : null}

                {cameraError ? (
                  <div className="absolute inset-x-4 top-16 rounded-2xl border border-neonPink/30 bg-neonPink/14 px-4 py-3 text-sm font-bold text-white backdrop-blur-xl">
                    {cameraError}
                  </div>
                ) : null}

                <div className="absolute inset-x-4 bottom-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <button
                    className="h-11 rounded-full border border-white/12 bg-black/38 px-3 text-xs font-black text-white backdrop-blur-xl active:scale-95"
                    type="button"
                    onClick={stopDeviceCamera}
                  >
                    Cerrar
                  </button>
                  <button
                    className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/20 shadow-neon backdrop-blur-xl active:scale-95"
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={isUploading || isCameraStarting}
                    aria-label="Capturar foto"
                  >
                    {isUploading ? <Loader2 className="h-7 w-7 animate-spin text-white" /> : <span className="h-11 w-11 rounded-full bg-white" />}
                  </button>
                  <button
                    className="h-11 rounded-full border border-neonCyan/20 bg-neonCyan/12 px-3 text-xs font-black text-white backdrop-blur-xl active:scale-95"
                    type="button"
                    onClick={handleSwitchCamera}
                    disabled={isCameraStarting || isUploading}
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="flex h-full w-full flex-col items-center justify-center px-6 text-center active:scale-[0.99]"
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Seleccionar imagen o vídeo de la galería"
              >
                <motion.div
                  className="grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink text-night shadow-neon"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  {isUploading ? <Loader2 className="h-10 w-10 animate-spin" /> : <Sparkles className="h-10 w-10" />}
                </motion.div>
                <p className="mt-5 text-2xl font-black text-white">
                  {isUploading ? "Subiendo..." : "Elige tu momento"}
                </p>
                <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-white/58">
                  Historias rápidas para enseñar qué está pasando ahora mismo.
                </p>

                {isUploading ? (
                  <div className="mt-5 w-full max-w-xs rounded-full bg-white/10 p-1">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-neonCyan via-neonYellow to-neonPink shadow-neon"
                      style={{ width: `${Math.max(8, uploadProgress)}%` }}
                    />
                  </div>
                ) : null}
              </button>
            )}
          </motion.section>

          {uploadError || error ? (
            <div className="mt-3 rounded-2xl border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-bold text-white">
              {uploadError || error}
            </div>
          ) : null}

          {media ? (
            <>
              <section className="hidden">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "texto", label: "Texto", icon: Type },
                    { id: "emoji", label: "Emoji", icon: Smile },
                    { id: "stickers", label: "Stickers", icon: Sparkles },
                    { id: "filtros", label: "Filtros", icon: Wand2 },
                    { id: "plantillas", label: "Plantillas", icon: Hash },
                  ].map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-black transition active:scale-95 ${
                          isActive
                            ? "border-neonPink bg-neonPink/18 text-white shadow-neon"
                            : "border-white/10 bg-black/18 text-white/58"
                        }`}
                        key={tool.id}
                        type="button"
                        onClick={() => setActiveTool(tool.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {tool.label}
                      </button>
                    );
                  })}
                </div>

                {activeTool === "texto" ? (
                  <div className="mt-2 space-y-2 rounded-[1.1rem] border border-white/8 bg-black/18 p-2">
                    <textarea
                      className="min-h-16 w-full resize-none rounded-2xl border border-white/10 bg-white/7 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/36 focus:border-neonPink"
                      name="text"
                      value={form.text}
                      onChange={updateField}
                      placeholder="Escribe sobre tu historia..."
                      maxLength={300}
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      {textSizes.map((size) => (
                        <button
                          className={`h-9 rounded-xl border text-xs font-black ${textStyle.size === size.id ? "border-neonPink bg-neonPink/18 text-white" : "border-white/10 bg-white/7 text-white/58"}`}
                          key={size.id}
                          type="button"
                          onClick={() => updateTextStyle("size", size.id)}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {textColors.map((color) => (
                        <button
                          className={`h-9 flex-1 rounded-xl border text-[10px] font-black ${textStyle.color === color.id ? "border-neonPink bg-white/12" : "border-white/10 bg-white/7"}`}
                          key={color.id}
                          type="button"
                          onClick={() => updateTextStyle("color", color.id)}
                        >
                          <span className={`mx-auto block h-4 w-4 rounded-full ${color.swatch}`} />
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {textBackgrounds.map((background) => (
                        <button
                          className={`h-9 rounded-xl border text-[10px] font-black ${textStyle.background === background.id ? "border-neonPink bg-neonPink/18 text-white" : "border-white/10 bg-white/7 text-white/58"}`}
                          key={background.id}
                          type="button"
                          onClick={() => updateTextStyle("background", background.id)}
                        >
                          {background.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "left", icon: AlignLeft, label: "Izq" },
                        { id: "center", icon: AlignCenter, label: "Centro" },
                        { id: "right", icon: AlignRight, label: "Der" },
                        { id: "glow", icon: Sparkles, label: "Glow" },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === "glow" ? textStyle.glow : textStyle.align === item.id;
                        return (
                          <button
                            className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border text-[10px] font-black ${isActive ? "border-neonCyan bg-neonCyan/14 text-white" : "border-white/10 bg-white/7 text-white/58"}`}
                            key={item.id}
                            type="button"
                            onClick={() => item.id === "glow" ? updateTextStyle("glow", !textStyle.glow) : updateTextStyle("align", item.id)}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {textPositions.map((position) => (
                        <button
                          className={`h-9 rounded-xl border text-[10px] font-black ${textStyle.position === position.id ? "border-neonPink bg-neonPink/18 text-white" : "border-white/10 bg-white/7 text-white/58"}`}
                          key={position.id}
                          type="button"
                          onClick={() => updateTextStyle("position", position.id)}
                        >
                          {position.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeTool === "emoji" ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto rounded-[1.1rem] border border-white/8 bg-black/18 p-2 scrollbar-none">
                    {quickEmojis.map((emoji) => (
                      <button
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/8 text-xl shadow-cyan active:scale-95"
                        key={emoji}
                        type="button"
                        onClick={() => appendToText(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}

                {activeTool === "stickers" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-[1.1rem] border border-white/8 bg-black/18 p-2">
                    {storyStickers.map((sticker) => {
                      const isActive = stickers.some((item) => item.id === sticker.id);
                      return (
                        <button
                          className={`rounded-2xl border px-3 py-2 text-left text-xs font-black transition active:scale-95 ${
                            isActive ? "border-neonPink bg-neonPink/16 text-white shadow-neon" : "border-white/10 bg-white/7 text-white/68"
                          }`}
                          key={sticker.id}
                          type="button"
                          onClick={() => toggleSticker(sticker)}
                        >
                          {sticker.value}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {activeTool === "filtros" ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto rounded-[1.1rem] border border-white/8 bg-black/18 p-2 scrollbar-none">
                    {storyFilters.map((filter) => (
                      <button
                        className={`grid h-14 w-20 shrink-0 place-items-center rounded-2xl border text-xs font-black transition active:scale-95 ${
                          selectedFilter.id === filter.id ? "border-neonPink bg-neonPink/18 text-white shadow-neon" : "border-white/10 bg-white/7 text-white/58"
                        }`}
                        key={filter.id}
                        type="button"
                        onClick={() => setSelectedFilter(filter)}
                      >
                        <span className={`grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-neonPink via-fiestaPurple to-neonCyan ${filter.className}`} />
                        {filter.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {activeTool === "plantillas" ? (
                  <div className="mt-2 grid gap-2 rounded-[1.1rem] border border-white/8 bg-black/18 p-2">
                    {storyTemplates.map((template) => (
                      <button
                        className="rounded-2xl border border-white/10 bg-white/7 px-3 py-2 text-left text-xs font-black text-white/72 transition active:scale-95"
                        key={template}
                        type="button"
                        onClick={() => applyTemplate(template)}
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-2 backdrop-blur-xl">
                {storyVisibilityOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = form.visibility === option.value;
                  return (
                    <label
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border text-xs font-black transition active:scale-95 ${
                        isActive
                          ? "border-neonPink bg-neonPink/18 text-white shadow-neon"
                          : "border-white/10 bg-black/18 text-white/58"
                      }`}
                      key={option.value}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={isActive}
                        onChange={updateField}
                      />
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </>
          ) : null}
        </main>

        <footer className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] z-30 px-4 sm:bottom-6">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-2 sm:max-w-2xl sm:grid-cols-[1fr_1fr_1.4fr]">
            {!media ? (
              <>
                <button
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-[1.15rem] border border-neonCyan/22 bg-neonCyan/12 px-4 text-sm font-black text-white shadow-cyan backdrop-blur-xl active:scale-95"
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon className="h-5 w-5 text-neonCyan" />
                  Galería
                </button>
                <button
	                  className="inline-flex h-13 items-center justify-center gap-2 rounded-[1.15rem] border border-neonPink/24 bg-neonPink/14 px-4 text-sm font-black text-white shadow-neon backdrop-blur-xl active:scale-95"
	                  type="button"
	                  onClick={() => startDeviceCamera()}
	                  disabled={isUploading || isCameraStarting}
	                >
	                  {isCameraStarting ? <Loader2 className="h-5 w-5 animate-spin text-neonPink" /> : <Camera className="h-5 w-5 text-neonPink" />}
	                  {isCameraStarting ? "Abriendo" : "Cámara"}
	                </button>
              </>
            ) : (
              <>
                <button
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-[1.15rem] border border-white/10 bg-white/8 px-4 text-sm font-black text-white/76 backdrop-blur-xl active:scale-95"
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isUploading || isSubmitting}
                >
                  {media.type === "video" ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                  Cambiar
                </button>
                <button
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-[1.15rem] border border-white/10 bg-white/8 px-4 text-sm font-black text-white/76 backdrop-blur-xl active:scale-95"
                  type="button"
                  onClick={() => toggleActiveTool("texto")}
                  disabled={isUploading || isSubmitting}
                >
                  <Type className="h-5 w-5" />
                  Texto
                </button>
                <button
                  className="col-span-2 inline-flex h-13 items-center justify-center gap-2 rounded-[1.15rem] bg-gradient-to-r from-neonGreen via-neonYellow to-neonPink px-4 text-sm font-black text-night shadow-neon disabled:opacity-60 sm:col-span-1"
                  disabled={isSubmitting || isUploading}
                  type="submit"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {isSubmitting ? "Publicando..." : "Publicar story"}
                </button>
              </>
            )}
          </div>
        </footer>
      </form>
    </section>
  );
}

export default CreateStory;
