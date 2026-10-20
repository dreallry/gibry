export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-200 rounded-lg ${className}`} />
  );
}

export function BookCardSkeleton() {
  return (
    <div>
      <div className="aspect-[3/4] rounded-2xl bg-zinc-200 animate-pulse mb-3" />
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-8">
      <div className="card">
        <Skeleton className="w-20 h-20 rounded-full mx-auto lg:mx-0 mb-4" />
        <Skeleton className="h-5 w-32 mx-auto lg:mx-0 mb-2" />
        <Skeleton className="h-3 w-48 mx-auto lg:mx-0 mb-4" />
        <div className="flex gap-4 justify-center lg:justify-start mb-4">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-12 w-16" />
        </div>
        <Skeleton className="h-3 w-40 mb-1" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-5 w-48 mb-4" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="card flex items-center gap-4 mb-3">
                <Skeleton className="w-12 h-16 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2 mb-1" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-12 w-20 mx-auto mb-2 bg-zinc-700" />
          <Skeleton className="h-3 w-24 mx-auto bg-zinc-700" />
        </div>
      ))}
    </div>
  );
}

export function AttendanceSkeleton() {
  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2">
        <div className="card">
          <Skeleton className="h-5 w-48 mb-6" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-4">
              <Skeleton className="h-3 w-20 mb-1.5" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-5 w-48 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4 mb-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/3 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="text-right">
              <Skeleton className="h-3 w-16 mb-1 ml-auto" />
              <Skeleton className="h-4 w-20 ml-auto rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LocationSkeleton() {
  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3">
        <div className="card h-[400px]" />
      </div>
      <div className="lg:col-span-2 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
