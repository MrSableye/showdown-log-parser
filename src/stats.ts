import { existsSync, readdir, readFile } from "fs";
import { join } from "path";
import { isRight } from "fp-ts/lib/Either";

import { BattleLog, battleLogType, Stats, Team } from "./types";

const toId = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const allDays = [
  '01', '02', '03', '04',
  '05', '06', '07', '08',
  '09', '10', '11', '12',
  '13', '14', '15', '16',
  '17', '18', '19', '20',
  '21', '22', '23', '24',
  '25', '26', '27', '28',
  '29', '30', '31',
];

const readBattleLog = async (
  path: string,
): Promise<BattleLog | undefined> => {
  return new Promise((resolve) => {
    readFile(path, { encoding: "utf8" }, (error, rawFile) => {
      if (error) {
        resolve(undefined);
      }

      if (rawFile) {
        const json = JSON.parse(rawFile);
        const battleLogResult = battleLogType.decode(json);

        if (isRight(battleLogResult)) {
          resolve(battleLogResult.right);
        }

        resolve(undefined);
      }

      resolve(undefined);
    });
  });
};

const readDirectoryIfExists = async (
  format: string,
  directory: string,
): Promise<string[]> => {
  return new Promise((resolve) => {
    if (!existsSync(directory)) {
      resolve([]);
    }

    readdir(directory, (error, files) => {
      if (error) {
        resolve([]);
      }

      if (files){
        resolve(
          files
            .filter((file) => file.startsWith(format) && file.endsWith(".log.json"))
            .map((file) => join(directory, file))
        );
      }
    });
  });
};

const createPathToLogs = (
  basePath: string,
  format: string,
  year: string | number,
  month: string | number,
  day: string | number,
) => join(
  basePath,
  `${year}-${month}`,
  format,
  `${year}-${month}-${day}`,
);

const retrieveBattleLogs = async (
  basePath: string,
  format: string,
  year: string | number,
  month: string | number,
  days: (string | number)[] = allDays,
): Promise<BattleLog[]> => {
  const directories = days.map((day) => createPathToLogs(basePath, format, year, month, day));
  const filePaths = (await Promise.all(directories.map((directory) => readDirectoryIfExists(format, directory)))).flat();
  return (await Promise.all(filePaths.map(readBattleLog))).filter((log) => log !== undefined) as BattleLog[];
};

const applyTeamToStats = (
  stats: Stats,
  battleLog: BattleLog,
  team: Team,
  opposingTeam: Team,
) => {
  stats.totalTeams++;
  const isWin = toId(battleLog.winner) === toId(battleLog.p1);
  team.forEach((set) => {
    const speciesId = toId(set.species);
    const itemId = toId(set.item);
    const abilityId = toId(set.ability);
    const natureId = toId(set.nature);
    const moveIds = set.moves.map(toId);

    if (!stats.pokemonStats[speciesId]) {
      stats.pokemonStats[speciesId] = {
        usage: 0,
        win: 0,
        partner: {},
        against: {},
        item: {},
        ability: {},
        nature: {},
        move: {},
      };
    }

    const partnerIds = [
      ...new Set(team.map((set) => set.species).map(toId).filter((partnerId) => partnerId !== speciesId)),
    ];
    partnerIds.forEach((partnerId) => {
      if (stats.pokemonStats[speciesId].partner[partnerId] === undefined) {
        stats.pokemonStats[speciesId].partner[partnerId] = { usage: 0, win: 0};
      }
      stats.pokemonStats[speciesId].partner[partnerId].usage++;
      if (isWin) stats.pokemonStats[speciesId].partner[partnerId].win++;
    });

    const againstIds = [
      ...new Set(opposingTeam.map((set) => set.species).map(toId)),
    ];
    againstIds.forEach((againstId) => {
      if (stats.pokemonStats[speciesId].against[againstId] === undefined) {
        stats.pokemonStats[speciesId].against[againstId] = { usage: 0, win: 0};
      }
      stats.pokemonStats[speciesId].against[againstId].usage++;
      if (isWin) stats.pokemonStats[speciesId].against[againstId].win++;
    });

    stats.pokemonStats[speciesId].usage++;
    if (isWin) {
      stats.pokemonStats[speciesId].win++;
    }

    if (stats.pokemonStats[speciesId].item[itemId] === undefined) {
      stats.pokemonStats[speciesId].item[itemId] = { usage: 0, win: 0};
    }
    stats.pokemonStats[speciesId].item[itemId].usage++;
    if (isWin) stats.pokemonStats[speciesId].item[itemId].win++;

    if (stats.pokemonStats[speciesId].ability[abilityId] === undefined) {
      stats.pokemonStats[speciesId].ability[abilityId] = { usage: 0, win: 0};
    }
    stats.pokemonStats[speciesId].ability[abilityId].usage++;
    if (isWin) stats.pokemonStats[speciesId].ability[abilityId].win++;

    if (stats.pokemonStats[speciesId].nature[natureId] === undefined) {
      stats.pokemonStats[speciesId].nature[natureId] = { usage: 0, win: 0};
    }
    stats.pokemonStats[speciesId].nature[natureId].usage++;
    if (isWin) stats.pokemonStats[speciesId].nature[natureId].win++;

    moveIds.forEach((moveId) => {
      if (stats.pokemonStats[speciesId].move[moveId] === undefined) {
        stats.pokemonStats[speciesId].move[moveId] = { usage: 0, win: 0};
      }
      stats.pokemonStats[speciesId].move[moveId].usage++;
      if (isWin) stats.pokemonStats[speciesId].move[moveId].win++;
    });
  });
};

export const generateMonthlyUsageStatistics = async (
  basePath: string,
  format: string,
  year: string | number,
  month: string | number,
): Promise<Stats> => {
  const battleLogs = await retrieveBattleLogs(basePath, format, year, month);
  return battleLogs.reduce((stats: Stats, battleLog) => {
    applyTeamToStats(stats, battleLog, battleLog.p1team, battleLog.p2team);
    applyTeamToStats(stats, battleLog, battleLog.p2team, battleLog.p1team);
    return stats;
  }, { totalTeams: 0, pokemonStats: {} });
};

export const generateDailyUsageStatistics = async (
  basePath: string,
  format: string,
  year: string | number,
  month: string | number,
  day: string | number,
): Promise<Stats> => {
  const battleLogs = await retrieveBattleLogs(basePath, format, year, month, [day]);
  return battleLogs.reduce((stats: Stats, battleLog) => {
    applyTeamToStats(stats, battleLog, battleLog.p1team, battleLog.p2team);
    applyTeamToStats(stats, battleLog, battleLog.p2team, battleLog.p1team);
    return stats;
  }, { totalTeams: 0, pokemonStats: {} });
};
