/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee } from "../types";
import { writeBatch, doc } from "firebase/firestore";
import { getSafeFirebase } from "../firebase";

/**
 * Safely resolves Firestore instance if configured
 */
function getSafeDb() {
  const { db } = getSafeFirebase();
  return db;
}

/**
 * Performs a batch write of employee documents to the Firestore 'employees' collection.
 */
export async function batchWriteEmployeesToFirestore(employees: Employee[]): Promise<{
  syncedToFirestore: boolean;
  count: number;
  error?: string;
}> {
  const db = getSafeDb();
  if (!db) {
    // Firestore not active in this preview session; local state and localStorage will retain records.
    return { syncedToFirestore: false, count: employees.length };
  }

  try {
    const batch = writeBatch(db);
    employees.forEach((emp) => {
      const docRef = doc(db, "employees", emp.id);
      batch.set(
        docRef,
        {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          joiningDate: emp.joiningDate,
          designation: emp.designation,
          phone: emp.phone || "",
          department: emp.department,
          managerId: emp.managerId || "",
          status: emp.status || "ACTIVE",
          compensation: emp.compensation || { basic: 30000, allowances: 10000 },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    return { syncedToFirestore: true, count: employees.length };
  } catch (err: any) {
    console.warn("Firestore batch write failed (fallback to local state):", err);
    return {
      syncedToFirestore: false,
      count: employees.length,
      error: err.message || "Failed to commit Firestore batch",
    };
  }
}
