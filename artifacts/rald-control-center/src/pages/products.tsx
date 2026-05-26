import { useListProducts, useGetProductStats } from "@workspace/api-client-react";
import { ExternalLink, TrendingUp, Users, Activity } from "lucide-react";

const PRODUCT_COLORS: Record<string, string> = {
  "loop-business": "#6366F1",
  "payrald": "#10B981",
  "loop-dispatch": "#F59E0B",
  "raldtics": "#8B5CF6",
  "loop-voice": "#EC4899",
  "gitrald": "#EF4444",
};

function ProductCard({ product }: { product: { id: string; name: string; slug: string; tagline: string; status: string; version: string; url?: string | null } }) {
  const color = PRODUCT_COLORS[product.slug] || "#6366F1";
  const { data: stats } = useGetProductStats(product.slug);

  return (
    <div className="border border-border bg-card hover:border-border/80 transition-colors relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">{product.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{product.tagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 text-xs font-medium uppercase tracking-wider border"
              style={{ color, borderColor: `${color}44`, backgroundColor: `${color}11` }}
            >
              {product.status}
            </span>
            {product.url && (
              <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="text-xs font-mono text-muted-foreground mb-4">{product.version}</div>

        {stats && (
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 mt-3">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Users className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-sm font-bold text-foreground">{stats.activeUsers?.toLocaleString() || "—"}</div>
              <div className="text-xs text-muted-foreground">Users</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Activity className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-sm font-bold text-foreground">{stats.requestsToday?.toLocaleString() || "—"}</div>
              <div className="text-xs text-muted-foreground">Requests</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-sm font-bold" style={{ color }}>
                {stats.uptime || "—"}
              </div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Products() {
  const { data: products, isLoading } = useListProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Products</h1>
        <p className="text-sm text-muted-foreground mt-1">RALD ecosystem — {products?.length || 0} products</p>
      </div>

      {isLoading ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">Loading products...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {products?.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      <div className="border border-border p-4 bg-muted/20">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Product Registry</h2>
        <div className="space-y-2">
          {products?.map(p => {
            const color = PRODUCT_COLORS[p.slug] || "#6366F1";
            return (
              <div key={p.id} className="flex items-center gap-3 text-xs">
                <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="font-mono text-muted-foreground w-32 flex-shrink-0">{p.slug}</span>
                <span className="text-foreground">{p.name}</span>
                <span className="text-muted-foreground ml-auto">{p.version}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
