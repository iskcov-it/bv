export const PRABHUPADA_QUOTES = [
  "Chant Hare Krishna and your life will be sublime.",
  "Krishna consciousness is the dormant love for Krishna within everyone.",
  "Be sincere and Krishna will help you.",
  "Everything can be utilized in the service of Krishna.",
  "Our only business is to love Krishna and help others love Krishna.",
  "By chanting Hare Krishna one becomes cleansed of all material contamination.",
  "A devotee sees every moment as an opportunity for service.",
  "Real happiness is to serve Krishna with love and devotion.",
  "Always remember Krishna and never forget Him.",
  "Spiritual life begins when we understand we are eternal servants of Krishna.",
  "If you simply chant sincerely, Krishna will reveal everything.",
  "Devotional service is joyful, practical, and eternal.",
  "This chanting of Hare Krishna is the prime benediction for humanity.",
  "The more we become purified by chanting, the more we become happy.",
  "A moment without Krishna consciousness is a great loss.",
  "Serve Krishna with determination and patience.",
  "The holy name and Krishna are nondifferent.",
  "When one chants Hare Krishna offenselessly, one awakens love of God.",
  "The purpose of life is to revive our relationship with Krishna.",
  "One who serves Krishna is the most intelligent person.",
  "Rise early, chant attentively, and your life will become perfect.",
  "Human life is meant for self-realization.",
  "Do everything for Krishna, and your life becomes spiritualized.",
  "The test of advancement is how much one is detached from material enjoyment.",
  "Simplicity and sincerity are ornaments of a devotee.",
  "The process is simple: hear about Krishna, chant His name, and remember Him.",
  "Krishna consciousness is not an artificial imposition; it is our natural life.",
  "The mind must be engaged in Krishna, otherwise it will drag us elsewhere.",
  "A devotee depends fully on the mercy of Krishna.",
  "By regulated life and chanting, everything becomes possible.",
  "Association with devotees is the root of bhakti.",
  "Without service attitude, spiritual life cannot progress.",
  "One sincere soul can change the whole atmosphere.",
  "Books are the basis, preaching is the essence, utility is the principle, purity is the force.",
  "Do not be lazy in spiritual life; every moment is valuable.",
  "The holy name is sufficient to make one perfect.",
  "To become happy, engage your senses in the service of the master of the senses.",
  "Krishna is in everyone's heart and He notices every sincere effort.",
  "A devotee is tolerant, humble, and fixed in service.",
  "Regular hearing and chanting are the medicine for the conditioned soul.",
  "The whole world is suffering for want of Krishna consciousness.",
  "One should be enthusiastic, patient, and confident in devotional service.",
  "Do not waste time; always be engaged in Krishna's service.",
  "The spiritual master shows the path back home, back to Godhead.",
  "The highest education is to understand Krishna.",
  "If you water the root, every part of the tree is nourished.",
  "Serve the Vaishnavas and Krishna will be pleased.",
  "A clean life supports a clear consciousness.",
  "Chanting and hearing keep us strong in spiritual life.",
  "Make your home a temple by chanting and honoring prasadam.",
  "Mercy descends where there is sincerity.",
  "A devotee's wealth is faith, service, and the holy name.",
  "Do not be discouraged; continue your service steadily.",
  "Krishna consciousness is the greatest welfare work.",
  "The tongue can deliver us when engaged in chanting and honoring prasadam.",
  "Our advancement is measured by our eagerness to serve.",
  "Every day should begin with remembrance of Krishna.",
  "The perfection of work is to satisfy Krishna.",
  "Chant with attention, hear carefully, and the heart will change.",
  "A devotee is happy in any condition because he depends on Krishna.",
] as const;

export type QuoteCategory = "general" | "japa" | "service" | "morning";

const CATEGORY_POOLS: Record<QuoteCategory, readonly string[]> = {
  general: PRABHUPADA_QUOTES,
  japa: PRABHUPADA_QUOTES.filter((q) =>
    /chant|holy name|hearing|remember/i.test(q)
  ),
  service: PRABHUPADA_QUOTES.filter((q) =>
    /service|serve|preaching|work|vaishnavas/i.test(q)
  ),
  morning: PRABHUPADA_QUOTES.filter((q) =>
    /rise early|every day|regulated|morning|remember/i.test(q)
  ),
};

export function pickPrabhupadaQuote(seed: string, category: QuoteCategory = "general") {
  const pool = CATEGORY_POOLS[category].length ? CATEGORY_POOLS[category] : PRABHUPADA_QUOTES;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}
