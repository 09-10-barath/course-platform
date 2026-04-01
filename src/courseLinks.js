const ensureAbsoluteUrl = (value) => {
  if (!value || typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^[\w.-]+\.[A-Za-z]{2,}/.test(trimmed)) return `https://${trimmed}`;

  return trimmed;
};

const extractYouTubeId = (url) => {
  if (!url) return "";

  if (url.hostname.includes("youtu.be")) {
    return url.pathname.split("/").filter(Boolean)[0] || "";
  }

  if (
    url.hostname.includes("youtube.com") ||
    url.hostname.includes("youtube-nocookie.com")
  ) {
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1] || "";
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
      return url.pathname.split("/").filter(Boolean)[1] || "";
    }
  }

  return "";
};

const toEmbedUrl = (value) => {
  const absoluteUrl = ensureAbsoluteUrl(value);
  if (!absoluteUrl) return "";

  try {
    const url = new URL(absoluteUrl);
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${youtubeId}`);
      embedUrl.searchParams.set("rel", "0");
      embedUrl.searchParams.set("modestbranding", "1");
      embedUrl.searchParams.set("playsinline", "1");
      embedUrl.searchParams.set("iv_load_policy", "3");
      return embedUrl.toString();
    }

    if (url.hostname.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0] || "";
      return videoId ? `https://player.vimeo.com/video/${videoId}` : absoluteUrl;
    }

    return absoluteUrl;
  } catch {
    return absoluteUrl;
  }
};

const isEmbeddableUrl = (value) => {
  const absoluteUrl = ensureAbsoluteUrl(value);
  if (!absoluteUrl) return false;

  try {
    const url = new URL(absoluteUrl);
    return (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtube-nocookie.com") ||
      url.hostname.includes("youtu.be") ||
      url.hostname.includes("vimeo.com")
    );
  } catch {
    return false;
  }
};

const getCourseVideoLinks = (course) => {
  const watchUrl = ensureAbsoluteUrl(
    course?.url || course?.videoUrl || course?.["Video Link"] || ""
  );

  return {
    watchUrl,
    embedUrl: watchUrl ? toEmbedUrl(watchUrl) : "",
    canEmbed: isEmbeddableUrl(watchUrl),
  };
};

export { ensureAbsoluteUrl, getCourseVideoLinks };
