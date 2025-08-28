// npm install dexie
import { useEffect, useState, useRef } from "react";
import Dexie from "dexie";

/**
 * Simple Dexie DB for transactions
 * transaction shape: {
 *   txid: string,           // unique primary key
 *   amount: string,         // "-0.01 BTC" or "-0.5 ETH"
 *   status: "Pending"|"Confirmed"|"Failed",
 *   timestamp: number,      // Date.now()
 *   crypto: "BTC"|"ETH"|...,
 *   meta: {...}             // optional extra metadata
 * }
 */

const db = new Dexie("WalletDB");
db.version(1).stores({
  transactions: "txid, timestamp, status, crypto" // txid as primary key
});

// Fallback functions if IndexedDB isn't available
const isIndexedDBAvailable = typeof indexedDB !== "undefined";

function localSave(transactions) {
  try {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  } catch (e) {
    console.warn("localStorage save failed", e);
  }
}
function localLoad() {
  try {
    const v = localStorage.getItem("transactions");
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

// Hook you can use in your component
export function usePersistentTransactions(initial = []) {
  const [transactions, setTransactions] = useState(initial);
  const readyRef = useRef(false);

  // Load from IndexedDB (or localStorage fallback) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isIndexedDBAvailable) {
          const stored = await db.transactions.orderBy("timestamp").reverse().toArray();
          if (!cancelled && stored && stored.length) {
            setTransactions(stored);
          } else if (!cancelled && (!stored || !stored.length)) {
            // nothing in db -> seed with initial if provided
            if (initial && initial.length) {
              // save initial to DB
              await db.transaction("rw", db.transactions, async () => {
                for (const t of initial) await db.transactions.put(t);
              });
              setTransactions(initial);
            }
          }
        } else {
          const saved = localLoad();
          if (saved) setTransactions(saved);
        }
      } catch (err) {
        console.error("Failed loading txs:", err);
        // fallback: load from localStorage if available
        const saved = localLoad();
        if (saved) setTransactions(saved);
      } finally {
        readyRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to IndexedDB whenever transactions change (debounced-ish)
  useEffect(() => {
    if (!readyRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        if (isIndexedDBAvailable) {
          // Put/update all transactions (simple approach). For large datasets, batch intelligently.
          await db.transaction("rw", db.transactions, async () => {
            for (const t of transactions) {
              await db.transactions.put(t); // upsert by txid
            }
            // Optionally delete removed txs: you can compare DB entries and remove ones not in `transactions`.
          });
        } else {
          localSave(transactions);
        }
      } catch (err) {
        console.warn("Failed to persist transactions:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactions]);

  // Helper: add transaction and persist
  const addTransaction = async (tx) => {
    // tx must include txid and timestamp
    const toStore = {
      timestamp: Date.now(),
      ...tx,
    };
    try {
      if (isIndexedDBAvailable) {
        await db.transactions.put(toStore);
      } else {
        const cur = localLoad() || transactions || [];
        localSave([toStore, ...cur]);
      }
      // update react state (place at top)
      setTransactions((prev) => [toStore, ...prev]);
    } catch (err) {
      console.error("addTransaction failed", err);
      // still update state so UX shows it immediately
      setTransactions((prev) => [toStore, ...prev]);
    }
  };

  // Helper: update status for a txid (and persist)
  const updateTransactionStatus = async (txid, updates) => {
    try {
      if (isIndexedDBAvailable) {
        await db.transactions.update(txid, updates);
      } else {
        const cur = localLoad() || transactions || [];
        const newCur = cur.map((t) => (t.txid === txid ? { ...t, ...updates } : t));
        localSave(newCur);
      }
      setTransactions((prev) => prev.map((t) => (t.txid === txid ? { ...t, ...updates } : t)));
    } catch (err) {
      console.error("updateTransactionStatus failed", err);
    }
  };

  // Helper: clear all transactions
  const clearTransactions = async () => {
    try {
      if (isIndexedDBAvailable) await db.transactions.clear();
      else localStorage.removeItem("transactions");
      setTransactions([]);
    } catch (err) {
      console.error("clearTransactions failed", err);
    }
  };

  // Helper: fetch pending txs (from DB) — useful for reconciliation
  const getPendingTransactions = async () => {
    if (isIndexedDBAvailable) {
      return await db.transactions.where("status").equals("Pending").toArray();
    } else {
      const cur = localLoad() || transactions || [];
      return cur.filter((t) => t.status === "Pending");
    }
  };

  return {
    transactions,
    addTransaction,
    updateTransactionStatus,
    clearTransactions,
    getPendingTransactions,
  };
}
