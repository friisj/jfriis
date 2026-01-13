export default function StoryMapsLoading() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              </th>
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
              </th>
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              </th>
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              </th>
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-20 bg-muted-foreground/20 rounded animate-pulse" />
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3">
                  <div className="h-5 w-40 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-56 bg-muted rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
