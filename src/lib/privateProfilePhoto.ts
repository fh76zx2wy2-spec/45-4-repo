import { useEffect, useState } from 'react';
import { ACTIVE_PROGRAM } from '../data/program';
import { supabase } from './supabase';
import { useAuth } from './auth';

const BUCKET = 'coach-profiles';
const PHOTO_PATH = ACTIVE_PROGRAM.key === 'abdulsalam'
  ? 'abdulsalam/profile.png'
  : 'ziyad/profile.png';

export function usePrivateProfilePhoto(): string | null {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!supabase || !user) return () => { alive = false; };

    (async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(PHOTO_PATH, 60 * 60);
      if (!alive) return;
      if (error || !data?.signedUrl) {
        setUrl(null);
        return;
      }
      setUrl(data.signedUrl);
    })();

    return () => { alive = false; };
  }, [user?.id]);

  return url;
}
