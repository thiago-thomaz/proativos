"use client";

import { useEffect, useState } from "react";
import { Bell, Flame, Calendar, DollarSign, ShieldAlert, Check, CheckCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    fetch("/api/v1/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setNotifications(d.notifications);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await fetch("/api/v1/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "READ", notificationId: id }),
    });
    fetchNotifs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Central de Notificações
          </h1>
          <p className="text-xs text-slate-400">
            Alertas em tempo real sobre oportunidades quentes, respostas de leads e status da plataforma.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando notificações...</div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
          Nenhuma notificação não lida no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="bg-slate-900/60 border-slate-800 hover:border-indigo-500/40 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{n.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(n.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => handleMarkAsRead(n.id)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Marcar como lida
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
