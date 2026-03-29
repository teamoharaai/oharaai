export interface Hobby {
  id: string;
  name: string;
  category: string;
  matchScore: number;
}

export async function getHobbyRecommendations(_userId: string): Promise<Hobby[]> {
  // TODO: implement hobby recommendations
  return [];
}
