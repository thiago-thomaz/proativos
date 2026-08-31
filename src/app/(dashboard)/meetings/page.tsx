"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Video, CheckCircle2, XCircle, User, Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/meetings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMeetings(d.meetings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Agenda Comercial & Reuniões
          </h1>
          <p className="text-xs text-slate-400">
            Reuniões agendadas com leads interessados e sincronização com o pipeline do CRM.
          </p>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Carregando reuniões...</div>
      ) : meetings.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
          Nenhuma reunião agendada no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m.id} className="bg-slate-900/60 border-slate-800 hover:border-indigo-500/40 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{m.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {m.lead?.company?.razaoSocial}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(m.scheduledAt).toLocaleString("pt-BR")} ({m.durationMinutes} min)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {m.status}
                  </Badge>
                  {m.meetingLink && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                      onClick={() => window.open(m.meetingLink, "_blank")}
                    >
                      <Video className="w-3.5 h-3.5 mr-1.5" />
                      Entrar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
