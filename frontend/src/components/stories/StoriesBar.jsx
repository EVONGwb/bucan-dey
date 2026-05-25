import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

function StoryAvatar({ group }) {
  const firstStory = group.stories[0];
  const initial = (group.user.display_name || group.user.username || "B").charAt(0).toUpperCase();

  return (
    <Link
      className="w-20 shrink-0 text-left"
      to={firstStory ? `/stories/${firstStory.id}` : "/"}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-neonGreen via-neonYellow to-neonPink p-0.5 shadow-neon">
        {group.user.avatar_url ? (
          <img
            alt={group.user.display_name}
            className="h-full w-full rounded-full border-2 border-night object-cover"
            decoding="async"
            loading="lazy"
            src={group.user.avatar_url}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-night bg-surface text-lg font-black text-white">
            {initial}
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-center text-xs font-bold text-white/70">
        {group.user.username}
      </p>
    </Link>
  );
}

function StoriesBar() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadStories() {
      try {
        const response = await apiClient.get("/stories/feed", { params: { limit: 80 } });
        if (isMounted) setGroups(response.data);
      } catch {
        if (isMounted) setGroups([]);
      }
    }

    loadStories();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  function handleCreate() {
    navigate(isAuthenticated ? "/stories/create" : "/login");
  }

  return (
    <div className="mt-7">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white/48">
          Stories
        </p>
        <Link className="text-xs font-black text-neonGreen" to="/stories/create">
          Crear
        </Link>
      </div>

      <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
        <button className="w-20 shrink-0 text-left" type="button" onClick={handleCreate}>
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-surface">
            {user?.avatar_url ? (
              <img
                alt={user.display_name}
                className="h-full w-full rounded-full object-cover"
                decoding="async"
                loading="lazy"
                src={user.avatar_url}
              />
            ) : (
              <span className="text-lg font-black text-white">
                {(user?.display_name || "T").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-neonPink text-lg font-black text-white">
              +
            </span>
          </div>
          <p className="mt-2 truncate text-center text-xs font-bold text-white/70">Tu Story</p>
        </button>

        {groups.map((group) => (
          <StoryAvatar key={group.user.id} group={group} />
        ))}
      </div>
    </div>
  );
}

export default StoriesBar;
