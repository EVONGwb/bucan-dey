import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Palette, Save, Send } from "lucide-react";

import apiClient from "../api/client.js";
import AdvancedTools from "../components/create/AdvancedTools.jsx";
import BusinessFields from "../components/create/BusinessFields.jsx";
import CreateHero from "../components/create/CreateHero.jsx";
import CreatorPreviewCards from "../components/create/CreatorPreviewCards.jsx";
import DraftManager from "../components/create/DraftManager.jsx";
import MusicWidget from "../components/create/MusicWidget.jsx";
import NearbyWidget from "../components/create/NearbyWidget.jsx";
import PostEditor from "../components/create/PostEditor.jsx";
import PrivacyEditor from "../components/create/PrivacyEditor.jsx";
import QuickActions from "../components/create/QuickActions.jsx";
import ThemeEditor from "../components/create/ThemeEditor.jsx";
import { creatorTypes } from "../components/create/TypeSelector.jsx";
import TypeSelector from "../components/create/TypeSelector.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

const initialForm = {
  text: "",
  type: "normal",
  visibility: "global",
  city: "",
  area: "",
  lat: "",
  lng: "",
  show_on_map: false,
  event_title: "",
  venue: "",
  start_at: "",
  price: "",
  is_open: true,
};

const initialExtraFields = {
  company: "",
  role: "",
  salary: "",
  city: "",
  schedule: "",
  contact: "",
};

const quickActionMap = {
  photo: "post",
  reel: "reel",
  audio: "post",
  place: "post",
  event: "event",
  taxi: "taxi",
  job: "job",
  pallets: "pallets",
  business: "business",
  trend: "community",
};

function resolveCreatorType(id) {
  return creatorTypes.find((type) => type.id === id) || creatorTypes[0];
}

function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [mediaItems, setMediaItems] = useState([]);
  const [creatorMode, setCreatorMode] = useState("post");
  const [selectedPrivacy, setSelectedPrivacy] = useState("all");
  const [selectedTheme, setSelectedTheme] = useState("neon");
  const [extraFields, setExtraFields] = useState(initialExtraFields);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasEventFields = useMemo(
    () => ["evento", "fiesta", "cumpleaños"].includes(form.type),
    [form.type]
  );

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateExtraField(name, value) {
    setExtraFields((current) => ({ ...current, [name]: value }));
  }

  function setSelectedLocation(lat, lng) {
    setForm((current) => ({
      ...current,
      lat: Number(lat).toFixed(6),
      lng: Number(lng).toFixed(6),
      show_on_map: true,
    }));
    setLocationError("");
  }

  function handleUseCurrentLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite obtener ubicación. Puedes elegir el punto en el mapa.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation(position.coords.latitude, position.coords.longitude);
        setShowLocationPicker(true);
        setIsLocating(false);
      },
      () => {
        setLocationError(
          "No se pudo obtener tu ubicación. Puedes elegir el punto manualmente en el mapa."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function handleMediaSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadError("");
      setIsUploading(true);
      const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMediaItems([response.data]);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  function applyCreatorType(type) {
    if (type.id === "live") {
      setCreatorMode(type.id);
      setForm((current) => ({ ...current, type: "live" }));
      return;
    }

    setCreatorMode(type.id);
    setForm((current) => ({
      ...current,
      type: type.backendType,
    }));
  }

  function handleQuickAction(actionId) {
    if (actionId === "place") {
      setShowLocationPicker(true);
      setNotice("El selector de ubicación está listo.");
      return;
    }

    const mappedType = resolveCreatorType(quickActionMap[actionId]);
    applyCreatorType(mappedType);
    setNotice(`${mappedType.label} seleccionado.`);
  }

  function handleHeroMode(mode) {
    const mappedMode = mode === "business" ? "business" : mode === "event" ? "event" : "post";
    applyCreatorType(resolveCreatorType(mappedMode));
  }

  function handlePrivacyChange(option) {
    setSelectedPrivacy(option.id);
    setForm((current) => ({ ...current, visibility: option.value }));
  }

  function composePostText() {
    const baseText = form.text.trim();

    if (!["job", "business", "taxi", "pallets", "sale"].includes(creatorMode)) {
      return baseText;
    }

    const labels = {
      job: "OFERTA DE TRABAJO",
      business: "NEGOCIO",
      taxi: "EVO TAXI",
      pallets: "CONECTAPALET",
      sale: "VENTA",
    };

    const details = [
      labels[creatorMode],
      extraFields.company ? `Empresa: ${extraFields.company}` : "",
      extraFields.role ? `${creatorMode === "pallets" ? "Producto" : "Puesto/servicio"}: ${extraFields.role}` : "",
      extraFields.salary ? `${creatorMode === "pallets" ? "Cantidad/precio" : "Salario"}: ${extraFields.salary}` : "",
      extraFields.city ? `Ciudad: ${extraFields.city}` : "",
      extraFields.schedule ? `Horario: ${extraFields.schedule}` : "",
      extraFields.contact ? `Contacto: ${extraFields.contact}` : "",
    ].filter(Boolean);

    return [baseText, details.join("\n")].filter(Boolean).join("\n\n");
  }

  function saveDraft() {
    const draft = {
      form,
      creatorMode,
      extraFields,
      selectedPrivacy,
      selectedTheme,
      mediaItems,
      saved_at: new Date().toISOString(),
    };
    try {
      localStorage.setItem("bucan_dey_create_draft", JSON.stringify(draft));
      setNotice("Borrador guardado en este dispositivo.");
    } catch {
      setNotice("No se pudo guardar el borrador en este dispositivo.");
    }
  }

  function personalize() {
    const themeOrder = ["neon", "africa", "oro", "evo", "minimal", "discord"];
    const currentIndex = themeOrder.indexOf(selectedTheme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setSelectedTheme(nextTheme);
    setNotice("Tema actualizado para la vista previa.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const postText = composePostText();
    if (!postText && mediaItems.length === 0) {
      setError("Añade texto, detalles o un archivo antes de publicar.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      type: form.type,
      visibility: form.visibility,
      text: postText,
      media: mediaItems,
      location: {
        city: form.city,
        area: form.area,
        lat: form.show_on_map && form.lat !== "" ? Number(form.lat) : null,
        lng: form.show_on_map && form.lng !== "" ? Number(form.lng) : null,
        show_on_map: form.show_on_map,
      },
    };

    if (hasEventFields) {
      payload.event_data = {
        title: form.event_title,
        venue: form.venue,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        price: form.price,
        is_open: form.is_open,
      };
    }

    try {
      await apiClient.post("/posts", payload);
      navigate(form.visibility === "global" ? "/" : "/profile", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-7rem)] overflow-hidden pb-44 text-white sm:mx-0">
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-neonPink/14 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-48 h-80 w-80 rounded-full bg-neonCyan/12 blur-3xl" />

      <form id="create-post-form" className="relative z-10 grid gap-4 px-4 lg:grid-cols-[1fr_20rem]" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <CreateHero
            activeMode={creatorMode}
            onModeChange={handleHeroMode}
            onLive={() => navigate("/lives/start")}
          />

          {notice ? (
            <div className="rounded-[1.1rem] border border-neonCyan/30 bg-neonCyan/10 px-4 py-3 text-sm font-semibold text-white">
              {notice}
            </div>
          ) : null}

          <PostEditor
            user={user}
            form={form}
            updateField={updateField}
            mediaItems={mediaItems}
            isUploading={isUploading}
            uploadError={uploadError}
            handleMediaSelect={handleMediaSelect}
            removeMedia={() => setMediaItems([])}
            hasEventFields={hasEventFields}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <QuickActions onAction={handleQuickAction} />
            <TypeSelector activeType={creatorMode} onSelect={applyCreatorType} />
          </div>

          <CreatorPreviewCards
            onSelectType={(id) => {
              const type = resolveCreatorType(id);
              applyCreatorType(type);
              setNotice(`${type.label} preparado.`);
            }}
          />

          <BusinessFields
            creatorMode={creatorMode}
            extraFields={extraFields}
            onExtraChange={updateExtraField}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <AdvancedTools />
            <ThemeEditor selectedTheme={selectedTheme} onThemeChange={setSelectedTheme} />
          </div>

          <NearbyWidget
            form={form}
            updateField={updateField}
            showLocationPicker={showLocationPicker}
            setShowLocationPicker={setShowLocationPicker}
            handleUseCurrentLocation={handleUseCurrentLocation}
            isLocating={isLocating}
            locationError={locationError}
            setSelectedLocation={setSelectedLocation}
          />

          {error ? (
            <div className="rounded-[1.1rem] border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
              {error}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <MusicWidget />
          <PrivacyEditor selectedPrivacy={selectedPrivacy} onPrivacyChange={handlePrivacyChange} />
          <DraftManager />
        </aside>
      </form>

      <div className="fixed inset-x-0 bottom-[6.7rem] z-20 px-4 sm:bottom-[6.9rem]">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 rounded-[1.45rem] border border-white/10 bg-night/82 p-2 shadow-neon backdrop-blur-2xl">
          <motion.button
            className="flex h-12 items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/6 text-xs font-black text-white sm:text-sm"
            type="button"
            onClick={saveDraft}
            whileTap={{ scale: 0.96 }}
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Guardar borrador</span>
            <span className="sm:hidden">Borrador</span>
          </motion.button>
          <motion.button
            className="flex h-12 items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/6 text-xs font-black text-white sm:text-sm"
            type="button"
            onClick={personalize}
            whileTap={{ scale: 0.96 }}
          >
            <Palette className="h-4 w-4" />
            Personalizar
          </motion.button>
          <motion.button
            className="flex h-12 items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-neonPink via-fiestaPurple to-neonCyan text-xs font-black text-white shadow-neon disabled:opacity-60 sm:text-base"
            type="submit"
            form="create-post-form"
            disabled={isSubmitting || isUploading}
            whileTap={{ scale: 0.96 }}
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Publicando..." : "Publicar ahora"}
          </motion.button>
        </div>
      </div>
    </section>
  );
}

export default CreatePost;
