import { HomePage } from "../pages/HomePage";

export function meta() {
  return [
    { title: "Andev Labs" },
    { name: "description", content: "Andev Labs." },
  ];
}

export default function Home() {
  return <HomePage />;
}
