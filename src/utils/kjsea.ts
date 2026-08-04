export interface KJSEAClassification {
  code: string;
  performance: string;
  category: string;
}

export interface LearnerClassificationRecord extends KJSEAClassification {
  admissionNumber: string;
  learnerName?: string;
  totalPoints: number;
  updatedAt?: string;
}

// ==============================================
// KJSEA TOTAL POINT CLASSIFICATION
// ==============================================
export function getKJSEAClassification(totalPoints: number): KJSEAClassification {
  if (totalPoints >= 68) return {
    code: 'EE1',
    performance: 'Exceeding Expectations 1',
    category: 'C1 — National'
  };
  if (totalPoints >= 60) return {
    code: 'EE2',
    performance: 'Exceeding Expectations 2',
    category: 'C1 — National'
  };
  if (totalPoints >= 52) return {
    code: 'ME1',
    performance: 'Meeting Expectations 1',
    category: 'C2 — Extra-County'
  };
  if (totalPoints >= 43) return {
    code: 'ME2',
    performance: 'Meeting Expectations 2',
    category: 'C2 — Extra-County'
  };
  if (totalPoints >= 34) return {
    code: 'AE1',
    performance: 'Approaching Expectations 1',
    category: 'C3 — County'
  };
  if (totalPoints >= 25) return {
    code: 'AE2',
    performance: 'Approaching Expectations 2',
    category: 'C3 — County'
  };
  if (totalPoints >= 16) return {
    code: 'BE1',
    performance: 'Below Expectations 1',
    category: 'C4 — Sub-County'
  };
  if (totalPoints >= 9) return {
    code: 'BE2',
    performance: 'Below Expectations 2',
    category: 'C4 — Sub-County'
  };
  return {
    code: 'BE2',
    performance: 'Below Expectations 2',
    category: 'C4 — Sub-County'
  };
}

// ==============================================
// SAVE CLASSIFICATION TO MONGODB
// ==============================================
export async function saveClassification(
  admissionNumber: string,
  totalPoints: number,
  learnerName?: string
): Promise<LearnerClassificationRecord | null> {
  const classification = getKJSEAClassification(totalPoints);
  try {
    const res = await fetch('/api/classification/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionNumber, totalPoints, learnerName })
    });
    const json = await res.json();
    if (json.success && json.classification) {
      console.log('✅ Classification Saved:', json.classification.code, json.classification.category);
      return json.classification;
    }
  } catch (err) {
    console.error("Error saving classification to MongoDB:", err);
  }
  return {
    admissionNumber,
    learnerName,
    totalPoints,
    ...classification,
    updatedAt: new Date().toISOString()
  };
}

// ==============================================
// READ CLASSIFICATION FROM MONGODB
// ==============================================
export async function getClassification(admissionNumber: string): Promise<LearnerClassificationRecord | null> {
  try {
    const res = await fetch('/api/classification/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionNumber })
    });
    const json = await res.json();
    if (json.success && json.classification) {
      return json.classification;
    }
  } catch (err) {
    console.error("Error reading classification from MongoDB:", err);
  }
  return null;
}

export async function getAllClassifications(): Promise<LearnerClassificationRecord[]> {
  try {
    const res = await fetch('/api/classification/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.documents)) {
      return json.documents;
    }
  } catch (err) {
    console.error("Error reading all classifications from MongoDB:", err);
  }
  return [];
}
