import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import yargs from 'yargs/yargs';
import {
  allDays,
  generateMonthlyUsageStatistics,
  generateDailyUsageStatistics,
} from "./stats";
import {
  dayIndexTemplate,
  formatIndexTemplate,
  monthIndexTemplate,
  pokemonTemplate,
  rootIndexTemplate,
  yearIndexTemplate,
} from './templates';
import { Stats, WinUsage } from './types';

const {
  directory,
  format: inputFormat,
  year: inputYear,
  month: inputMonth,
  outputType,
  outputDirectory,
} = yargs(process.argv).options({
  directory: {
    type: "string",
    demandOption: true,
  },
  format: {
    type: "string",
    demandOption: true,
  },
  year: {
    type: "string",
    demandOption: true,
  },
  month: {
    type: "string",
    demandOption: true,
  },
  outputType: {
    type: "string",
    demandOption: true,
    choices: ['html', 'json'],
  },
  outputDirectory: {
    type: "string",
    demandOption: true,
  }
}).argv;

const formats: string[] = Array.isArray(inputFormat) ? inputFormat : [inputFormat];
const years: string[] = Array.isArray(inputYear) ? inputYear : [inputYear];
const months: string[] = Array.isArray(inputMonth) ? inputMonth : [inputMonth];
const outputTypes: string[] = Array.isArray(outputType) ? outputType : [outputType];

const createJSON = outputTypes.includes('json');
const createHTML = outputTypes.includes('html');

const getSortedWinUsage = (winUsageStats: Record<string, WinUsage>) => {
  return Object.entries(winUsageStats)
    .map(([name, stats]) => ({
      name,
      stats,
    }))
    .sort((entryA, entryB) => entryB.stats.usage - entryA.stats.usage);
};

const getSortedEntries = (stats: Stats) => {
  return Object.entries(stats.pokemonStats)
    .map(([pokemon, pokemonStats]) => ({
      name: pokemon,
      stats: {
        ...pokemonStats,
        partner: getSortedWinUsage(pokemonStats.partner),
        against: getSortedWinUsage(pokemonStats.against),
        item: getSortedWinUsage(pokemonStats.item),
        ability: getSortedWinUsage(pokemonStats.ability),
        nature: getSortedWinUsage(pokemonStats.nature),
        move: getSortedWinUsage(pokemonStats.move),
      },
    }))
    .sort((entryA, entryB) => entryB.stats.usage - entryA.stats.usage);
};

Promise.all(formats.map(async (format) => {
  const formatDirectory = join(outputDirectory, format);

  const yearlyStats = (await Promise.all(years.map(async (year) => {
    const yearDirectory = join(formatDirectory, year);

    const monthlyStats = (await Promise.all(months.map(async (month) => {
      const monthDirectory = join(yearDirectory, month);

      const monthStats = await generateMonthlyUsageStatistics(
        directory,
        format,
        year,
        month,
      );

      const sortedMonthEntries = getSortedEntries(monthStats).filter((entry) => {
        return entry.stats.usage > 0;
      });

      const dailyStats = (await Promise.all(allDays.map(async (day) => {
        const dayDirectory = join(monthDirectory, day);

        const dayStats = await generateDailyUsageStatistics(
          directory,
          format,
          year,
          month,
          day,
        );

        const sortedDayEntries = getSortedEntries(dayStats).filter((entry) => {
          return entry.stats.usage > 0;
        });

        if (sortedDayEntries.length > 0) {
          if (!existsSync(dayDirectory)) {
            mkdirSync(dayDirectory, { recursive: true });
          }
          
          sortedDayEntries.forEach((entry) => {
            if (createHTML) {
              writeFileSync(join(dayDirectory, `${entry.name}.html`), pokemonTemplate({
                ...entry,
                totalTeams: dayStats.totalTeams,
                title: `${format} ${year}/${month}/${day} ${entry.name} Usage Stats`,
              }), 'utf8');
            }

            if (createJSON) {
              writeFileSync(join(dayDirectory, `${entry.name}.json`), JSON.stringify(entry), 'utf8');
            }
          });

          if (createHTML) {
            writeFileSync(join(dayDirectory, 'index.html'), dayIndexTemplate({
              totalTeams: dayStats.totalTeams,
              pokemonEntries: sortedDayEntries,
              format,
              year,
              month,
              day,
              title: `${format} ${year}/${month}/${day} Usage Stats`,
            }), 'utf8');
          }

          if (createJSON) {
            writeFileSync(join(dayDirectory, 'index.json'), JSON.stringify(dayStats), 'utf8');
          }
        }

        return [day, dayStats] as [string, Stats];
      }))).filter(([day, dayStats]) => {
        return dayStats.totalTeams > 0;
      });

      if (dailyStats.length > 0) {
        if (!existsSync(monthDirectory)) {
          mkdirSync(monthDirectory, { recursive: true });
        }
        
        sortedMonthEntries.forEach((entry) => {
          if (createHTML) {
            writeFileSync(join(monthDirectory, `${entry.name}.html`), pokemonTemplate({
              ...entry,
              totalTeams: monthStats.totalTeams,
              title: `${format} ${year}/${month} ${entry.name} Usage Stats`,
            }), 'utf8');
          }

          if (createJSON) {
            writeFileSync(join(monthDirectory, `${entry.name}.json`), JSON.stringify(entry), 'utf8');
          }
        });

        if (createHTML) {
          writeFileSync(join(monthDirectory, 'index.html'), monthIndexTemplate({
            totalTeams: monthStats.totalTeams,
            pokemonEntries: sortedMonthEntries,
            days: dailyStats.map((dailyStat) => dailyStat[0]),
            format,
            year,
            month,
            title: `${format} ${year}/${month} Usage Stats`,
          }), 'utf8');
        }
        
        if (createJSON) {
          writeFileSync(join(monthDirectory, 'index.json'), JSON.stringify(monthStats), 'utf8');
        }
      }

      return [month, monthStats] as [string, Stats];
    }))).filter(([month, monthStats]) => {
      return monthStats.totalTeams > 0;
    });

    if (monthlyStats.length > 0) {
      if (!existsSync(formatDirectory)) {
        mkdirSync(yearDirectory, { recursive: true });
      }

      if (createHTML) {
        writeFileSync(join(yearDirectory, 'index.html'), yearIndexTemplate({
          months: monthlyStats.map((monthlyStat) => monthlyStat[0]),
          format,
          year,
          title: `${format} ${year} Usage Stats`,
        }), 'utf8');
      }
    }

    return [year, monthlyStats.map((monthlyStat) => monthlyStat[0]).length > 0] as [string, boolean];
  }))).filter(([year, hasData]) => hasData);

  if (yearlyStats.length > 0) {
    if (!existsSync(formatDirectory)) {
      mkdirSync(formatDirectory, { recursive: true });
    }

    if (createHTML) {
      writeFileSync(join(formatDirectory, 'index.html'), formatIndexTemplate({
        years: yearlyStats.map((yearlyStat) => yearlyStat[0]),
        format,
        title: `${format} Usage Stats`,
      }), 'utf8');
    }
  }

  return [format, yearlyStats.length > 0] as [string, boolean];
})).then((formatsStats) => {
  return formatsStats.filter((formatStats) => formatStats[1]);
}).then((formatsStats) => {
  if (formatsStats.length > 0) {
    if (!existsSync(outputDirectory)) {
      mkdirSync(outputDirectory, { recursive: true });
    }

    if (createHTML) {
      writeFileSync(join(outputDirectory, 'index.html'), rootIndexTemplate({
        formats: formatsStats.map((formatStats) => formatStats[0]),
        title: 'Usage Stats',
      }), 'utf8');
    }
  }
});
