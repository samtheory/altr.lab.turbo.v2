/** Fixture `Database` in the shape `jord gen types` emits, plus optional `Relationships`. */
export interface Database {
  "public.posts": {
    Row: {
      author_id: number;
      body: string | null;
      id: number;
      published: boolean;
      title: string;
    };
    Insert: {
      author_id: number;
      body?: string | null;
      id?: number;
      published?: boolean;
      title: string;
    };
    Update: {
      author_id?: number;
      body?: string | null;
      id?: number;
      published?: boolean;
      title?: string;
    };
    Relationships: { author: { table: "public.users" } };
  };
  "public.users": {
    Row: { id: number; meta: unknown; name: string; score: number };
    Insert: { id?: number; meta?: unknown; name: string; score: number };
    Update: { id?: number; meta?: unknown; name?: string; score?: number };
    Relationships: { posts: { table: "public.posts"; many: true } };
  };
}
