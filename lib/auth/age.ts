/**
 * Exact age check for consent. Calendar-year subtraction is not safe: a
 * learner born in December is still 17 in November of the following year even
 * though the year difference is 18.
 */
export function isMinor(dateOfBirth: string | Date, now: Date = new Date()): boolean {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;

  const year = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  const day = now.getUTCDate() - dob.getUTCDate();
  const age = month < 0 ? year - 1 : month === 0 && day < 0 ? year - 1 : year;
  return age < 18;
}

export function ageOn(dateOfBirth: string | Date, now: Date = new Date()): number | null {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}
