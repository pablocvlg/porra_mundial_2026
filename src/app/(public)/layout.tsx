import Navbar from "../components/NavBar";
import Rules from "../components/Rules";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar/>
      <Rules/>
      {children}
    </>
  );
}