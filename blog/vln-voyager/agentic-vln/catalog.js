


// Handle already-failed lazy images as well as future error events.
document.querySelectorAll("figure img").forEach((image) => { if (image.complete && !image.naturalWidth) { const fallback = image.closest("figure").querySelector(".image-fallback"); if (fallback) fallback.hidden = false; } });
