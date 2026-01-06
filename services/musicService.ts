import { SongPlayData } from '../types';

// ==========================================
// UTILS
// ==========================================

// JSONP for iTunes (Client-side only, no proxy needed)
let jsonpCounter = 0;
const fetchJsonp = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');
    // Ensure URL has ? or &
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.async = true;
    
    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };
    
    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed for ${url}`));
    };
    
    const cleanup = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      delete (window as any)[callbackName];
    };
    
    document.body.appendChild(script);
  });
};

// ==========================================
// MAIN EXPORT
// ==========================================

export const getSongSegment = async (searchQuery: string, targetWord?: string): Promise<SongPlayData | null> => {
  // We strictly use iTunes here as it works in browser without a backend proxy.
  // It provides 30s previews. We cannot do exact lyric timestamping, 
  // but we can provide the music context.
  
  try {
    // Clean query: "Song - Artist" -> "Song Artist"
    // Remove parentheses stuff like (Remix) to improve match rate
    const cleanQuery = searchQuery.replace(/ - /g, ' ').replace(/\(.*\)/, '').trim();
    const term = encodeURIComponent(cleanQuery);
    
    // iTunes Search API
    // limit=1, media=music, entity=song
    // Note: We use https for iOS compatibility
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`;
    
    const data = await fetchJsonp(url);
    
    if (!data || data.resultCount === 0 || !data.results[0]) {
      console.warn(`[Music] No results found on iTunes for: ${searchQuery}`);
      return null;
    }

    const track = data.results[0];
    
    // iTunes previewUrl is usually .m4a
    // We play from the start of the preview (0)
    return {
      url: track.previewUrl,
      startTime: 0, 
      duration: 29.5, // Play full preview
      name: track.trackName,
      artist: track.artistName
    };
  } catch (e) {
    console.error("[Music] Error fetching from iTunes", e);
    return null;
  }
};