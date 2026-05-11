import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";

const FundraiserPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { navigate("/donate", { replace: true }); return; }

    fetch(`/.netlify/functions/fundraiser-link?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success && data.link?.student_name) {
          setName(data.link.student_name);
          // Short preview, then redirect to the donate page with ref
          setTimeout(() => {
            navigate(`/donate?ref=${encodeURIComponent(slug)}`, { replace: true });
          }, 1800);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [slug, navigate]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Fundraiser link not found</h2>
          <p className="text-gray-500 mb-6">This link may be inactive or doesn't exist.</p>
          <a href="/donate" className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition">
            Donate Directly →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="text-6xl mb-5">🎉</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {name ? (
            <>You're supporting via <span className="text-yellow-500">{name}</span>'s link!</>
          ) : (
            "Loading fundraiser…"
          )}
        </h2>
        <p className="text-gray-500 text-lg mb-4">Redirecting you to the donation page…</p>
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
};

export default FundraiserPage;
