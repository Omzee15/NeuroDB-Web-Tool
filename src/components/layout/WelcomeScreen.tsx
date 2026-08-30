"use client";

import { useState } from "react";
import { ConnectionModal } from "@/components/sidebar/ConnectionModal";

export function WelcomeScreen() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h2>NeuroDB</h2>
        <p>AI-powered PostgreSQL database management</p>
        <div className="welcome-actions">
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            Create Connection
          </button>
        </div>
      </div>
      {modalOpen && <ConnectionModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
