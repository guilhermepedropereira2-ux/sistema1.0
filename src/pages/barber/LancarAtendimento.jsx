import { useNavigate } from "react-router-dom";
import LancarAtendimentoModal from "@/components/LancarAtendimentoModal";

export default function LancarAtendimento() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <LancarAtendimentoModal
        open={true}
        onClose={() => navigate("/barbeiro")}
        onSuccess={() => navigate("/barbeiro")}
      />
    </div>
  );
}
