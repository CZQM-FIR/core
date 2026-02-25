import { query } from '$app/server';
import { db } from '$lib/db';
import { fetchStaffPageData } from '@czqm/common';

export const getStaffPageData = query(async () => {
  return await fetchStaffPageData(db);
});
