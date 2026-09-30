import { CategoryList } from "@/features/categories/components/category-list";
import { ImportForm } from "@/features/import/components/import-form";

export function App() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Budget</h1>
      <ImportForm />
      <CategoryList />
    </main>
  );
}
