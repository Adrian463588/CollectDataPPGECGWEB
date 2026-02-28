// ============================================================
// Device Check Page — Verify wearable devices are ready
// ============================================================

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseIndicator from "@/components/layout/PhaseIndicator";
import { useHeartbeat } from "@/hooks/useHeartbeat";

const devices = [
  {
    id: "galaxy-watch",
    name: "Samsung Galaxy Watch",
    description: "PPG sensor on your wrist — HR monitoring app is running",
    icon: "⌚",
  },
  {
    id: "polar-h10",
    name: "Polar H10",
    description: "ECG chest strap is secured and connected",
    icon: "💓",
  },
];

export default function DeviceCheckPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useHeartbeat(sessionId);

  const allChecked = devices.every((d) => checked[d.id]);

  const handleContinue = () => {
    router.push(`/session/${sessionId}/relaxation`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-4 flex items-center justify-between">
        <PhaseIndicator phase="DEVICE_CHECK" />
      </div>

      <div className="px-6 pt-2">
        <ProgressBar currentPhase="DEVICE_CHECK" />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card>
            <h2 className="text-2xl font-bold text-white mb-2">
              Device Check
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Please confirm that your wearable devices are ready.
            </p>

            <div className="space-y-4 mb-8">
              {devices.map((device, i) => (
                <motion.label
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`
                    flex items-start gap-4 p-4 rounded-xl border cursor-pointer
                    transition-colors duration-200
                    ${
                      checked[device.id]
                        ? "bg-indigo-600/10 border-indigo-500/30"
                        : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[device.id]}
                    onChange={(e) =>
                      setChecked((prev) => ({
                        ...prev,
                        [device.id]: e.target.checked,
                      }))
                    }
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                    id={`device-${device.id}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{device.icon}</span>
                      <span className="font-semibold text-white">
                        {device.name}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {device.description}
                    </p>
                  </div>
                </motion.label>
              ))}
            </div>

            <Button
              onClick={handleContinue}
              disabled={!allChecked}
              className="w-full"
              size="lg"
              id="device-continue-btn"
            >
              My Devices Are Ready — Continue
            </Button>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
