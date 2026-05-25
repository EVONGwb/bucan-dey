import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import apiClient from "../api/client.js";
import PostCard from "../components/post/PostCard.jsx";
import { FeedSkeleton } from "../components/ui/Skeletons.jsx";
import { getApiErrorMessage } from "../utils/errors.js";

function PostPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPost() {
      try {
        setIsLoading(true);
        setError("");
        const response = await apiClient.get(`/posts/${postId}`);
        setPost(response.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [postId]);

  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
            Publicación
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">BUCAN DEY</h1>
        </div>
        <Link
          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white"
          to="/"
        >
          Inicio
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-neonPink/30 bg-neonPink/10 px-4 py-3 text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      {isLoading ? <FeedSkeleton count={1} /> : null}

      {!isLoading && post ? (
        <div className="mt-6">
          <PostCard post={post} />
        </div>
      ) : null}
    </section>
  );
}

export default PostPage;
