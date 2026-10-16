import { notFound } from "next/navigation";

// Белгісіз сілтемелер (/kk/abc) тілге сай 404 бетін көрсетеді (not-found.tsx)
export default function CatchAllPage() {
  notFound();
}
