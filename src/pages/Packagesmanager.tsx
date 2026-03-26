import { useState, useEffect } from "react";
import { ref, get, set, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Btn } from "@/components/shared/Btn";

// Style helpers (you can also use Tailwind classes if preferred)
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 4,
  color: "hsl(var(--muted-foreground))",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 13,
  color: "hsl(var(--foreground))",
};

interface Package {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  badge?: string;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

interface Member {
  uid: string;
  name: string;
  email: string;
  membership: string;
  classCredits: number;
}

interface PackagesManagerProps {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

export function PackagesManager({ toast }: PackagesManagerProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [assignUid, setAssignUid] = useState("");
  const [assignCredits, setAssignCredits] = useState("10");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  const blank = {
    name: "",
    description: "",
    credits: "10",
    price: "299",
    badge: "",
    active: true,
  };
  const [form, setForm] = useState(blank);
  const f =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  // Load packages
  const loadPackages = async () => {
    setLoading(true);
    try {
      const snap = await get(ref(db, "packages"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([id, val]: [string, any]) => ({
            id,
            ...val,
          }),
        );
        setPackages(list.sort((a: any, b: any) => a.price - b.price));
      } else {
        setPackages([]);
      }
    } catch {
      toast("Failed to load packages", "error");
    }
    setLoading(false);
  };

  // Load members for manual credit assignment
  const loadMembers = async () => {
    try {
      const snap = await get(ref(db, "mk2_users"));
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(
          ([uid, val]: [string, any]) => ({
            uid,
            name: val.name || "Unnamed",
            email: val.email || "",
            membership: val.membership || "basic",
            classCredits: val.classCredits ?? 0,
          }),
        );
        setMembers(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch {
      toast("Failed to load members", "error");
    }
  };

  useEffect(() => {
    loadPackages();
    loadMembers();
  }, []);

  // Save / update package
  const save = async () => {
    if (!form.name || !form.credits || !form.price)
      return toast("Fill in Name, Credits and Price", "error");

    const data = {
      name: form.name,
      description: form.description,
      credits: parseInt(form.credits),
      price: parseInt(form.price),
      badge: form.badge,
      active: form.active,
      updatedAt: Date.now(),
    };

    try {
      if (editing) {
        await set(ref(db, `packages/${editing.id}`), data);
        toast("Package updated ✓", "success");
      } else {
        const newRef = push(ref(db, "packages"));
        await set(newRef, { ...data, createdAt: Date.now() });
        toast("Package created ✓", "success");
      }
      setShowForm(false);
      setEditing(null);
      setForm(blank);
      loadPackages();
    } catch {
      toast("Save failed", "error");
    }
  };

  const toggleActive = async (pkg: Package) => {
    await set(ref(db, `packages/${pkg.id}/active`), !pkg.active);
    toast(pkg.active ? "Package hidden" : "Package visible ✓", "info");
    loadPackages();
  };

  const del = async (pkg: Package) => {
    if (!confirm(`Delete "${pkg.name}"?`)) return;
    await remove(ref(db, `packages/${pkg.id}`));
    toast("Deleted", "info");
    loadPackages();
  };

  const startEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      credits: String(pkg.credits),
      price: String(pkg.price),
      badge: pkg.badge || "",
      active: pkg.active !== false,
    });
    setShowForm(true);
  };

  // Manual credit assignment
  const assignCreditsToUser = async () => {
    if (!assignUid) return toast("Select a member", "error");
    const amount = parseInt(assignCredits);
    if (!amount || amount < 1)
      return toast("Enter valid credit amount", "error");

    setAssigning(true);
    try {
      const memberRef = ref(db, `mk2_users/${assignUid}/classCredits`);
      const snap = await get(memberRef);
      const current = snap.exists() ? (snap.val() as number) : 0;
      await set(memberRef, current + amount);

      // Log the transaction
      const historyRef = push(ref(db, `mk2_users/${assignUid}/creditHistory`));
      await set(historyRef, {
        amount,
        type: "manual_assign",
        note: assignNote || "Admin assignment",
        timestamp: Date.now(),
        adminAssigned: true,
      });

      // Update local members list
      setMembers((prev) =>
        prev.map((m) =>
          m.uid === assignUid ? { ...m, classCredits: current + amount } : m,
        ),
      );

      toast(`+${amount} credits assigned ✓`, "success");
      setAssignNote("");
    } catch {
      toast("Assignment failed", "error");
    }
    setAssigning(false);
  };

  const selectedMember = members.find((m) => m.uid === assignUid);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Class Credit Packages ({packages.length})
        </div>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm(blank);
          }}
        >
          {showForm ? "✕ Cancel" : "+ New Package"}
        </Btn>
      </div>

      {/* ── Add/Edit form ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              {editing ? "Edit Package" : "New Package"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Package Name</label>
                <input
                  style={inp}
                  placeholder="e.g. 10-Class Pack"
                  value={form.name}
                  onChange={f("name")}
                />
              </div>
              <div>
                <label style={lbl}>Credits</label>
                <input
                  style={inp}
                  type="number"
                  placeholder="10"
                  value={form.credits}
                  onChange={f("credits")}
                />
              </div>
              <div>
                <label style={lbl}>Price (ZAR)</label>
                <input
                  style={inp}
                  type="number"
                  placeholder="299"
                  value={form.price}
                  onChange={f("price")}
                />
              </div>
              <div>
                <label style={lbl}>Badge (optional)</label>
                <input
                  style={inp}
                  placeholder="Best Value"
                  value={form.badge}
                  onChange={f("badge")}
                />
              </div>
              <div>
                <label style={lbl}>Visible to members?</label>
                <select
                  style={inp}
                  value={form.active ? "true" : "false"}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      active: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">✓ Visible</option>
                  <option value="false">✕ Hidden</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <input
                style={inp}
                placeholder="e.g. Perfect for regular gym-goers"
                value={form.description}
                onChange={f("description")}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={save}>
                {editing ? "Save Changes" : "Create Package"}
              </Btn>
              <Btn
                variant="subtle"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Package list ────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
          Loading…
        </div>
      ) : packages.length === 0 ? (
        <div
          style={{
            color: "hsl(var(--muted-foreground))",
            fontSize: 13,
            padding: "20px 0",
          }}
        >
          No packages yet. Create one above.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                background: "hsl(var(--card))",
                border: `1px solid ${pkg.active ? "hsl(var(--border))" : "hsl(var(--border) / 0.4)"}`,
                borderRadius: 12,
                padding: 16,
                opacity: pkg.active ? 1 : 0.6,
              }}
            >
              {pkg.badge && (
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: 20,
                    background: "hsl(20 100% 50% / 0.15)",
                    color: "hsl(20 100% 50%)",
                    border: "1px solid hsl(20 100% 50% / 0.3)",
                    marginBottom: 10,
                  }}
                >
                  {pkg.badge}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {pkg.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: 10,
                }}
              >
                {pkg.description}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: "hsl(20 100% 50%)",
                  }}
                >
                  {pkg.credits}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  credits
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
                R{pkg.price}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn variant="subtle" size="sm" onClick={() => startEdit(pkg)}>
                  Edit
                </Btn>
                <Btn
                  variant={pkg.active ? "subtle" : "success"}
                  size="sm"
                  onClick={() => toggleActive(pkg)}
                >
                  {pkg.active ? "Hide" : "Show"}
                </Btn>
                <Btn variant="danger" size="sm" onClick={() => del(pkg)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Manual credit assignment ─────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid hsl(var(--border))",
          paddingTop: 24,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          Manually Assign Credits
        </div>
        <div
          style={{
            fontSize: 12,
            color: "hsl(var(--muted-foreground))",
            marginBottom: 16,
          }}
        >
          Use this to assign credits when a member pays in cash or via EFT.
          PayFast will do this automatically once live.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={lbl}>Member</label>
            <select
              style={inp}
              value={assignUid}
              onChange={(e) => setAssignUid(e.target.value)}
            >
              <option value="">— Select member —</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.name} ({m.email}) — {m.classCredits} credits
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Credits to Add</label>
            <input
              style={inp}
              type="number"
              min="1"
              max="100"
              value={assignCredits}
              onChange={(e) => setAssignCredits(e.target.value)}
            />
          </div>
          <div>
            <label style={lbl}>Note (optional)</label>
            <input
              style={inp}
              placeholder="e.g. Cash payment - 10-pack"
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
            />
          </div>
        </div>

        {selectedMember && (
          <div
            style={{
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
              marginBottom: 12,
              padding: "8px 12px",
              background: "hsl(var(--secondary))",
              borderRadius: 8,
            }}
          >
            {selectedMember.name} currently has{" "}
            <strong style={{ color: "hsl(20 100% 50%)" }}>
              {selectedMember.classCredits} credits
            </strong>
            . After assignment:{" "}
            <strong style={{ color: "hsl(142 72% 37%)" }}>
              {selectedMember.classCredits + parseInt(assignCredits || "0")}{" "}
              credits
            </strong>
          </div>
        )}

        <Btn
          variant="success"
          onClick={assignCreditsToUser}
          disabled={assigning || !assignUid}
        >
          {assigning ? "Assigning…" : `✓ Assign ${assignCredits} Credits`}
        </Btn>
      </div>
    </div>
  );
}

// // ─────────────────────────────────────────────────────────────────────────────
// // PackagesManager.tsx
// // Drop this component into Admin.tsx and add a tab for it.
// //
// // HOW TO ADD TO ADMIN.TSX:
// // 1. Paste this entire component above the TABS array in Admin.tsx
// // 2. Add to TABS array:
// //    { id: "packages", label: "🎟 Packages", desc: "Manage class credit packages" },
// // 3. Add to the tab render section:
// //    {tab === "packages" && <PackagesManager toast={toast} />}
// // 4. Add these two imports at the top of Admin.tsx (if not already there):
// //    import { push } from "firebase/database";
// //    (ref, get, set, remove are already imported)
// // ─────────────────────────────────────────────────────────────────────────────

// // ── PackagesManager ───────────────────────────────────────────────────────────
// // Manages class credit packages in Firebase `packages/` collection
// // Also lets admin manually assign credits to any member

// function PackagesManager({ toast }: any) {
//   const [packages, setPackages] = useState<any[]>([]);
//   const [members, setMembers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState<any>(null);
//   const [assignUid, setAssignUid] = useState("");
//   const [assignCredits, setAssignCredits] = useState("10");
//   const [assignNote, setAssignNote] = useState("");
//   const [assigning, setAssigning] = useState(false);

//   const blank = {
//     name: "",
//     description: "",
//     credits: "10",
//     price: "299",
//     badge: "",
//     active: true,
//   };
//   const [form, setForm] = useState(blank);
//   const f = (k: string) => (e: any) =>
//     setForm((p) => ({ ...p, [k]: e.target.value }));

//   // Load packages
//   const loadPackages = async () => {
//     setLoading(true);
//     try {
//       const snap = await get(ref(db, "packages"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([id, val]: [string, any]) => ({
//             id,
//             ...val,
//           }),
//         );
//         setPackages(list.sort((a: any, b: any) => a.price - b.price));
//       } else {
//         setPackages([]);
//       }
//     } catch {
//       toast("Failed to load packages", "error");
//     }
//     setLoading(false);
//   };

//   // Load members for manual credit assignment
//   const loadMembers = async () => {
//     try {
//       const snap = await get(ref(db, "mk2_users"));
//       if (snap.exists()) {
//         const list = Object.entries(snap.val()).map(
//           ([uid, val]: [string, any]) => ({
//             uid,
//             name: val.name || "Unnamed",
//             email: val.email || "",
//             membership: val.membership || "basic",
//             classCredits: val.classCredits ?? 0,
//           }),
//         );
//         setMembers(list.sort((a: any, b: any) => a.name.localeCompare(b.name)));
//       }
//     } catch {
//       toast("Failed to load members", "error");
//     }
//   };

//   useEffect(() => {
//     loadPackages();
//     loadMembers();
//   }, []);

//   // Save / update package
//   const save = async () => {
//     if (!form.name || !form.credits || !form.price)
//       return toast("Fill in Name, Credits and Price", "error");

//     const data = {
//       name: form.name,
//       description: form.description,
//       credits: parseInt(form.credits),
//       price: parseInt(form.price),
//       badge: form.badge,
//       active: form.active,
//       updatedAt: Date.now(),
//     };

//     try {
//       if (editing) {
//         await set(ref(db, `packages/${editing.id}`), data);
//         toast("Package updated ✓", "success");
//       } else {
//         // Use push to get a unique key
//         const newRef = ref(db, "packages");
//         const { push: fbPush } = await import("firebase/database");
//         await fbPush(newRef, { ...data, createdAt: Date.now() });
//         toast("Package created ✓", "success");
//       }
//       setShowForm(false);
//       setEditing(null);
//       setForm(blank);
//       loadPackages();
//     } catch {
//       toast("Save failed", "error");
//     }
//   };

//   const toggleActive = async (pkg: any) => {
//     await set(ref(db, `packages/${pkg.id}/active`), !pkg.active);
//     toast(pkg.active ? "Package hidden" : "Package visible ✓", "info");
//     loadPackages();
//   };

//   const del = async (pkg: any) => {
//     if (!confirm(`Delete "${pkg.name}"?`)) return;
//     await remove(ref(db, `packages/${pkg.id}`));
//     toast("Deleted", "info");
//     loadPackages();
//   };

//   const startEdit = (pkg: any) => {
//     setEditing(pkg);
//     setForm({
//       name: pkg.name,
//       description: pkg.description || "",
//       credits: String(pkg.credits),
//       price: String(pkg.price),
//       badge: pkg.badge || "",
//       active: pkg.active !== false,
//     });
//     setShowForm(true);
//   };

//   // Manual credit assignment
//   const assignCreditsToUser = async () => {
//     if (!assignUid) return toast("Select a member", "error");
//     const amount = parseInt(assignCredits);
//     if (!amount || amount < 1)
//       return toast("Enter valid credit amount", "error");

//     setAssigning(true);
//     try {
//       const memberRef = ref(db, `mk2_users/${assignUid}/classCredits`);
//       const snap = await get(memberRef);
//       const current = snap.exists() ? (snap.val() as number) : 0;
//       await set(memberRef, current + amount);

//       // Log the transaction
//       const { push: fbPush } = await import("firebase/database");
//       await fbPush(ref(db, `mk2_users/${assignUid}/creditHistory`), {
//         amount,
//         type: "manual_assign",
//         note: assignNote || "Admin assignment",
//         timestamp: Date.now(),
//         adminAssigned: true,
//       });

//       // Update local members list
//       setMembers((prev) =>
//         prev.map((m) =>
//           m.uid === assignUid ? { ...m, classCredits: current + amount } : m,
//         ),
//       );

//       toast(`+${amount} credits assigned ✓`, "success");
//       setAssignNote("");
//     } catch {
//       toast("Assignment failed", "error");
//     }
//     setAssigning(false);
//   };

//   const selectedMember = members.find((m) => m.uid === assignUid);

//   return (
//     <div>
//       {/* ── Header ─────────────────────────────────────────────────────── */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 20,
//           flexWrap: "wrap",
//           gap: 10,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15 }}>
//           Class Credit Packages ({packages.length})
//         </div>
//         <Btn
//           variant="primary"
//           size="sm"
//           onClick={() => {
//             setShowForm(!showForm);
//             setEditing(null);
//             setForm(blank);
//           }}
//         >
//           {showForm ? "✕ Cancel" : "+ New Package"}
//         </Btn>
//       </div>

//       {/* ── Add/Edit form ───────────────────────────────────────────────── */}
//       <AnimatePresence>
//         {showForm && (
//           <motion.div
//             initial={{ opacity: 0, y: -8 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             style={{
//               background: "hsl(var(--secondary))",
//               border: "1px solid hsl(var(--border))",
//               borderRadius: 12,
//               padding: 20,
//               marginBottom: 20,
//             }}
//           >
//             <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
//               {editing ? "Edit Package" : "New Package"}
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
//                 gap: 12,
//                 marginBottom: 12,
//               }}
//             >
//               <div style={{ gridColumn: "1/-1" }}>
//                 <label style={lbl}>Package Name</label>
//                 <input
//                   style={inp}
//                   placeholder="e.g. 10-Class Pack"
//                   value={form.name}
//                   onChange={f("name")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Credits</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="10"
//                   value={form.credits}
//                   onChange={f("credits")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Price (ZAR)</label>
//                 <input
//                   style={inp}
//                   type="number"
//                   placeholder="299"
//                   value={form.price}
//                   onChange={f("price")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Badge (optional)</label>
//                 <input
//                   style={inp}
//                   placeholder="Best Value"
//                   value={form.badge}
//                   onChange={f("badge")}
//                 />
//               </div>
//               <div>
//                 <label style={lbl}>Visible to members?</label>
//                 <select
//                   style={inp}
//                   value={form.active ? "true" : "false"}
//                   onChange={(e) =>
//                     setForm((p) => ({
//                       ...p,
//                       active: e.target.value === "true",
//                     }))
//                   }
//                 >
//                   <option value="true">✓ Visible</option>
//                   <option value="false">✕ Hidden</option>
//                 </select>
//               </div>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <label style={lbl}>Description</label>
//               <input
//                 style={inp}
//                 placeholder="e.g. Perfect for regular gym-goers"
//                 value={form.description}
//                 onChange={f("description")}
//               />
//             </div>
//             <div style={{ display: "flex", gap: 10 }}>
//               <Btn variant="primary" onClick={save}>
//                 {editing ? "Save Changes" : "Create Package"}
//               </Btn>
//               <Btn
//                 variant="subtle"
//                 onClick={() => {
//                   setShowForm(false);
//                   setEditing(null);
//                 }}
//               >
//                 Cancel
//               </Btn>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ── Package list ────────────────────────────────────────────────── */}
//       {loading ? (
//         <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
//           Loading…
//         </div>
//       ) : packages.length === 0 ? (
//         <div
//           style={{
//             color: "hsl(var(--muted-foreground))",
//             fontSize: 13,
//             padding: "20px 0",
//           }}
//         >
//           No packages yet. Create one above.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
//             gap: 12,
//             marginBottom: 32,
//           }}
//         >
//           {packages.map((pkg) => (
//             <div
//               key={pkg.id}
//               style={{
//                 background: "hsl(var(--card))",
//                 border: `1px solid ${pkg.active ? "hsl(var(--border))" : "hsl(var(--border) / 0.4)"}`,
//                 borderRadius: 12,
//                 padding: 16,
//                 opacity: pkg.active ? 1 : 0.6,
//               }}
//             >
//               {pkg.badge && (
//                 <div
//                   style={{
//                     display: "inline-block",
//                     fontSize: 10,
//                     fontWeight: 700,
//                     padding: "2px 10px",
//                     borderRadius: 20,
//                     background: "hsl(20 100% 50% / 0.15)",
//                     color: "hsl(20 100% 50%)",
//                     border: "1px solid hsl(20 100% 50% / 0.3)",
//                     marginBottom: 10,
//                   }}
//                 >
//                   {pkg.badge}
//                 </div>
//               )}
//               <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
//                 {pkg.name}
//               </div>
//               <div
//                 style={{
//                   fontSize: 12,
//                   color: "hsl(var(--muted-foreground))",
//                   marginBottom: 10,
//                 }}
//               >
//                 {pkg.description}
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "baseline",
//                   gap: 6,
//                   marginBottom: 4,
//                 }}
//               >
//                 <span
//                   style={{
//                     fontFamily: "var(--font-display)",
//                     fontSize: 28,
//                     color: "hsl(20 100% 50%)",
//                   }}
//                 >
//                   {pkg.credits}
//                 </span>
//                 <span
//                   style={{
//                     fontSize: 12,
//                     color: "hsl(var(--muted-foreground))",
//                   }}
//                 >
//                   credits
//                 </span>
//               </div>
//               <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
//                 R{pkg.price}
//               </div>
//               <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                 <Btn variant="subtle" size="sm" onClick={() => startEdit(pkg)}>
//                   Edit
//                 </Btn>
//                 <Btn
//                   variant={pkg.active ? "subtle" : "green"}
//                   size="sm"
//                   onClick={() => toggleActive(pkg)}
//                 >
//                   {pkg.active ? "Hide" : "Show"}
//                 </Btn>
//                 <Btn variant="danger" size="sm" onClick={() => del(pkg)}>
//                   Delete
//                 </Btn>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* ── Manual credit assignment ─────────────────────────────────────── */}
//       <div
//         style={{
//           borderTop: "1px solid hsl(var(--border))",
//           paddingTop: 24,
//           marginTop: 8,
//         }}
//       >
//         <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
//           Manually Assign Credits
//         </div>
//         <div
//           style={{
//             fontSize: 12,
//             color: "hsl(var(--muted-foreground))",
//             marginBottom: 16,
//           }}
//         >
//           Use this to assign credits when a member pays in cash or via EFT.
//           PayFast will do this automatically once live.
//         </div>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
//             gap: 12,
//             marginBottom: 14,
//           }}
//         >
//           <div>
//             <label style={lbl}>Member</label>
//             <select
//               style={inp}
//               value={assignUid}
//               onChange={(e) => setAssignUid(e.target.value)}
//             >
//               <option value="">— Select member —</option>
//               {members.map((m) => (
//                 <option key={m.uid} value={m.uid}>
//                   {m.name} ({m.email}) — {m.classCredits} credits
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label style={lbl}>Credits to Add</label>
//             <input
//               style={inp}
//               type="number"
//               min="1"
//               max="100"
//               value={assignCredits}
//               onChange={(e) => setAssignCredits(e.target.value)}
//             />
//           </div>
//           <div>
//             <label style={lbl}>Note (optional)</label>
//             <input
//               style={inp}
//               placeholder="e.g. Cash payment - 10-pack"
//               value={assignNote}
//               onChange={(e) => setAssignNote(e.target.value)}
//             />
//           </div>
//         </div>

//         {selectedMember && (
//           <div
//             style={{
//               fontSize: 12,
//               color: "hsl(var(--muted-foreground))",
//               marginBottom: 12,
//               padding: "8px 12px",
//               background: "hsl(var(--secondary))",
//               borderRadius: 8,
//             }}
//           >
//             {selectedMember.name} currently has{" "}
//             <strong style={{ color: "hsl(20 100% 50%)" }}>
//               {selectedMember.classCredits} credits
//             </strong>
//             . After assignment:{" "}
//             <strong style={{ color: "hsl(142 72% 37%)" }}>
//               {selectedMember.classCredits + parseInt(assignCredits || "0")}{" "}
//               credits
//             </strong>
//           </div>
//         )}

//         <Btn
//           variant="green"
//           onClick={assignCreditsToUser}
//           disabled={assigning || !assignUid}
//         >
//           {assigning ? "Assigning…" : `✓ Assign ${assignCredits} Credits`}
//         </Btn>
//       </div>
//     </div>
//   );
// }
