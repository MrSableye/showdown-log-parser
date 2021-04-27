import { readFileSync } from 'fs';
import { join } from 'path';
import { registerHelper, registerPartial, compile } from 'handlebars';
import helpers from 'handlebars-helpers';

const layoutTemplate = readFileSync(join(__dirname, 'layout.html.hbs'), 'utf8');
registerPartial('layout', layoutTemplate);
registerHelper(helpers(['math', 'string']));

export const rootIndexTemplate = compile(readFileSync(join(__dirname, 'root-index.html.hbs'), 'utf8'));
export const formatIndexTemplate = compile(readFileSync(join(__dirname, 'format-index.html.hbs'), 'utf8'));
export const yearIndexTemplate = compile(readFileSync(join(__dirname, 'year-index.html.hbs'), 'utf8'));
export const monthIndexTemplate = compile(readFileSync(join(__dirname, 'month-index.html.hbs'), 'utf8'));
export const dayIndexTemplate = compile(readFileSync(join(__dirname, 'day-index.html.hbs'), 'utf8'));
export const pokemonTemplate = compile(readFileSync(join(__dirname, 'pokemon.html.hbs'), 'utf8'));
