function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-white/7 via-white/12 to-white/7 ${className}`}
    />
  );
}

export function PageFallback() {
  return (
    <div className="space-y-5 pt-2">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="h-10 w-48" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-32 w-full" />
    </div>
  );
}

export function FeedSkeleton({ count = 3 }) {
  return (
    <div className="mt-5 space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="glass-panel rounded-[1.75rem] p-4"
          key={`feed-skeleton-${index}`}
        >
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-11 w-11 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
            <SkeletonBlock className="h-7 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="mt-5 h-4 w-2/3" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-4 h-60 w-full rounded-[1.35rem]" />
          <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
            <SkeletonBlock className="h-9 w-12" />
            <SkeletonBlock className="h-9 w-12" />
            <SkeletonBlock className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="rounded-lg border border-white/10 bg-surface p-4"
          key={`list-skeleton-${index}`}
        >
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mt-8 rounded-lg border border-white/10 bg-surface p-5">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-4 w-28" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </div>
      <SkeletonBlock className="mt-4 h-24" />
    </div>
  );
}

export function ChatSkeleton() {
  return <ListSkeleton count={5} />;
}

export function CommentsSkeleton() {
  return <ListSkeleton count={2} />;
}
