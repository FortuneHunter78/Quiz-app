export const db = {
  query: async (query: string, params: any[]) => {
    console.log("Executing query:", query, params);
    return { rows: [] };
  },
};
