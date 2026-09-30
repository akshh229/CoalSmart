"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Snapshot } from "@/lib/types";
type Context = {
  data: Snapshot;
  refresh: () => Promise<void>;
  post: <T>(path: string, body: unknown) => Promise<T>;
  notify: (message: string) => void;
  openEvidence: (id: string) => void;
  busy: boolean;
  message: string;
  evidenceId: string | null;
  closeEvidence: () => void;
};
const DataContext = createContext<Context | null>(null);
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("Data provider missing");
  return ctx;
}
export function DataProvider({
  initial,
  view,
  children,
}: {
  initial: Snapshot;
  view: string;
  children: ReactNode;
}) {
  const [data, setData] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [evidenceId, setEvidenceId] = useState<string | null>(null);
  const notify = useCallback((text: string) => setMessage(text), []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh shared data.");
      setData(await response.json());
    } catch {
      setMessage(
        "Could not refresh shared data. Check your connection and retry.",
      );
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/data", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Refresh failed");
        return response.json();
      })
      .then((result) => setData(result))
      .catch((error) => {
        if (error.name !== "AbortError")
          setMessage(
            "Could not refresh shared data. Check your connection and retry.",
          );
      });
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", focus);
    };
  }, [refresh, view]);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(timeout);
  }, [message]);
  const post = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      setBusy(true);
      try {
        const response = await fetch(`/api/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "The request failed.");
        await refresh();
        return result as T;
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "The request failed.",
        );
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );
  return (
    <DataContext.Provider
      value={{
        data,
        refresh,
        post,
        notify,
        openEvidence: setEvidenceId,
        busy,
        message,
        evidenceId,
        closeEvidence: () => setEvidenceId(null),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
