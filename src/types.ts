import * as t from "io-ts";

export const setType = t.type({
  species: t.string,
  item: t.string,
  ability: t.string,
  nature: t.string,
  moves: t.array(t.string),
});
export type Set = t.TypeOf<typeof setType>;

export const teamType = t.array(setType);
export type Team = t.TypeOf<typeof teamType>;

export const battleLogType = t.type({
  winner: t.string,
  p1: t.string,
  p2: t.string,
  p1team: teamType,
  p2team: teamType,
  p1rating: t.number,
  p2rating: t.number,
  timestamp: t.string,
});
export type BattleLog = t.TypeOf<typeof battleLogType>;

export const winUsageType = t.type({
  usage: t.number,
  win: t.number,
});
export type WinUsage = t.TypeOf<typeof winUsageType>;

export const pokemonStatsType = t.type({
  usage: t.number,
  win: t.number,
  partner: t.record(t.string, winUsageType),
  against: t.record(t.string, winUsageType),
  item: t.record(t.string, winUsageType),
  ability: t.record(t.string, winUsageType),
  nature: t.record(t.string, winUsageType),
  move: t.record(t.string, winUsageType),
});
export type PokemonStats = t.TypeOf<typeof pokemonStatsType>;

export const statsType = t.type({
  totalTeams: t.number,
  pokemonStats: t.record(t.string, pokemonStatsType),
});
export type Stats = t.TypeOf<typeof statsType>;
