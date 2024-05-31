import {Release} from '@sentry/release-parser';
import round from 'lodash/round';

import {t, tn} from 'sentry/locale';
import type {CommitAuthor, User} from 'sentry/types';
import {RATE_UNIT_LABELS, RateUnit} from 'sentry/utils/discover/fields';

export function userDisplayName(user: User | CommitAuthor, includeEmail = true): string {
  let displayName = String(user?.name ?? t('Unknown author')).trim();

  if (displayName.length <= 0) {
    displayName = t('Unknown author');
  }

  const email = String(user?.email ?? '').trim();

  if (email.length > 0 && email !== displayName && includeEmail) {
    displayName += ' (' + email + ')';
  }
  return displayName;
}

export const isSemverRelease = (rawVersion: string): boolean => {
  try {
    const parsedVersion = new Release(rawVersion);
    return !!parsedVersion.versionParsed;
  } catch {
    return false;
  }
};

export const formatVersion = (rawVersion: string, withPackage = false) => {
  try {
    const parsedVersion = new Release(rawVersion);
    const versionToDisplay = parsedVersion.describe();

    if (versionToDisplay.length) {
      return `${versionToDisplay}${
        withPackage && parsedVersion.package ? `, ${parsedVersion.package}` : ''
      }`;
    }

    return rawVersion;
  } catch {
    return rawVersion;
  }
};

// in milliseconds
export const MONTH = 2629800000;
export const WEEK = 604800000;
export const DAY = 86400000;
export const HOUR = 3600000;
export const MINUTE = 60000;
export const SECOND = 1000;
export const MILLISECOND = 1;
export const MICROSECOND = 0.001;
export const NANOSECOND = 0.000001;

const SUFFIX_ABBR = {
  years: t('yr'),
  weeks: t('wk'),
  days: t('d'),
  hours: t('hr'),
  minutes: t('min'),
  seconds: t('s'),
  milliseconds: t('ms'),
};
/**
 * Returns a human readable exact duration.
 * 'precision' arg will truncate the results to the specified suffix
 *
 * e.g. 1 hour 25 minutes 15 seconds
 */
export function getExactDuration(
  seconds: number,
  abbreviation: boolean = false,
  precision: keyof typeof SUFFIX_ABBR = 'milliseconds'
) {
  const minSuffix = ` ${precision}`;

  const convertDuration = (secs: number, abbr: boolean): string => {
    // value in milliseconds
    const msValue = round(secs * 1000);
    const value = round(Math.abs(secs * 1000));

    const divideBy = (time: number) => {
      return {
        quotient: msValue < 0 ? Math.ceil(msValue / time) : Math.floor(msValue / time),
        remainder: msValue % time,
      };
    };

    if (value >= WEEK || (value && minSuffix === ' weeks')) {
      const {quotient, remainder} = divideBy(WEEK);
      const suffix = abbr ? t('wk') : ` ${tn('week', 'weeks', quotient)}`;

      return `${quotient}${suffix} ${
        minSuffix === suffix ? '' : convertDuration(remainder / 1000, abbr)
      }`;
    }
    if (value >= DAY || (value && minSuffix === ' days')) {
      const {quotient, remainder} = divideBy(DAY);
      const suffix = abbr ? t('d') : ` ${tn('day', 'days', quotient)}`;

      return `${quotient}${suffix} ${
        minSuffix === suffix ? '' : convertDuration(remainder / 1000, abbr)
      }`;
    }
    if (value >= HOUR || (value && minSuffix === ' hours')) {
      const {quotient, remainder} = divideBy(HOUR);
      const suffix = abbr ? t('hr') : ` ${tn('hour', 'hours', quotient)}`;

      return `${quotient}${suffix} ${
        minSuffix === suffix ? '' : convertDuration(remainder / 1000, abbr)
      }`;
    }
    if (value >= MINUTE || (value && minSuffix === ' minutes')) {
      const {quotient, remainder} = divideBy(MINUTE);
      const suffix = abbr ? t('min') : ` ${tn('minute', 'minutes', quotient)}`;

      return `${quotient}${suffix} ${
        minSuffix === suffix ? '' : convertDuration(remainder / 1000, abbr)
      }`;
    }
    if (value >= SECOND || (value && minSuffix === ' seconds')) {
      const {quotient, remainder} = divideBy(SECOND);
      const suffix = abbr ? t('s') : ` ${tn('second', 'seconds', quotient)}`;

      return `${quotient}${suffix} ${
        minSuffix === suffix ? '' : convertDuration(remainder / 1000, abbr)
      }`;
    }

    if (value === 0) {
      return '';
    }

    const suffix = abbr ? t('ms') : ` ${tn('millisecond', 'milliseconds', value)}`;

    return `${msValue}${suffix}`;
  };

  const result = convertDuration(seconds, abbreviation).trim();

  if (result.length) {
    return result;
  }

  return `0${abbreviation ? SUFFIX_ABBR[precision] : minSuffix}`;
}

export function formatSecondsToClock(
  seconds: number,
  {padAll}: {padAll: boolean} = {padAll: true}
) {
  if (seconds === 0 || isNaN(seconds)) {
    return padAll ? '00:00' : '0:00';
  }

  const divideBy = (msValue: number, time: number) => {
    return {
      quotient: msValue < 0 ? Math.ceil(msValue / time) : Math.floor(msValue / time),
      remainder: msValue % time,
    };
  };

  // value in milliseconds
  const absMSValue = round(Math.abs(seconds * 1000));

  const {quotient: hours, remainder: rMins} = divideBy(absMSValue, HOUR);
  const {quotient: minutes, remainder: rSeconds} = divideBy(rMins, MINUTE);
  const {quotient: secs, remainder: milliseconds} = divideBy(rSeconds, SECOND);

  const fill = (num: number) => (num < 10 ? `0${num}` : String(num));

  const parts = hours
    ? [padAll ? fill(hours) : hours, fill(minutes), fill(secs)]
    : [padAll ? fill(minutes) : minutes, fill(secs)];

  const ms = `000${milliseconds}`.slice(-3);
  return milliseconds ? `${parts.join(':')}.${ms}` : parts.join(':');
}

export function parseClockToSeconds(clock: string) {
  const [rest, milliseconds] = clock.split('.');
  const parts = rest.split(':');

  let seconds = 0;
  const progression = [MONTH, WEEK, DAY, HOUR, MINUTE, SECOND].slice(parts.length * -1);
  for (let i = 0; i < parts.length; i++) {
    const num = Number(parts[i]) || 0;
    const time = progression[i] / 1000;
    seconds += num * time;
  }
  const ms = Number(milliseconds) || 0;
  return seconds + ms / 1000;
}

export function formatFloat(number: number, places: number) {
  const multi = Math.pow(10, places);
  return parseInt((number * multi).toString(), 10) / multi;
}

/**
 * Format a value between 0 and 1 as a percentage
 */
export function formatPercentage(
  value: number,
  places: number = 2,
  options: {
    minimumValue?: number;
  } = {}
) {
  if (value === 0) {
    return '0%';
  }

  const minimumValue = options.minimumValue ?? 0;

  if (Math.abs(value) <= minimumValue) {
    return `<${minimumValue * 100}%`;
  }

  return (
    round(value * 100, places).toLocaleString(undefined, {
      maximumFractionDigits: places,
    }) + '%'
  );
}

const numberFormatSteps = [
  [1_000_000_000, 'b'],
  [1_000_000, 'm'],
  [1_000, 'k'],
] as const;

/**
 * Formats a number with an abbreviation e.g. 1000 -> 1k.
 *
 * @param number the number to format
 * @param maximumSignificantDigits the number of significant digits to include
 * @param includeDecimals when true, formatted number will always include non trailing zero decimal places
 */
export function formatAbbreviatedNumber(
  number: number | string,
  maximumSignificantDigits?: number,
  includeDecimals?: boolean
): string {
  number = Number(number);

  const prefix = number < 0 ? '-' : '';
  const numAbsValue = Math.abs(number);

  for (const step of numberFormatSteps) {
    const [suffixNum, suffix] = step;
    const shortValue = Math.floor(numAbsValue / suffixNum);
    const fitsBound = numAbsValue % suffixNum === 0;

    if (shortValue <= 0) {
      continue;
    }

    const useShortValue = !includeDecimals && (shortValue > 10 || fitsBound);

    if (useShortValue) {
      if (maximumSignificantDigits === undefined) {
        return `${prefix}${shortValue}${suffix}`;
      }
      const formattedNumber = parseFloat(
        shortValue.toPrecision(maximumSignificantDigits)
      ).toString();
      return `${prefix}${formattedNumber}${suffix}`;
    }

    const formattedNumber = formatFloat(
      numAbsValue / suffixNum,
      maximumSignificantDigits || 1
    ).toLocaleString(undefined, {
      maximumSignificantDigits,
    });

    return `${prefix}${formattedNumber}${suffix}`;
  }

  return number.toLocaleString(undefined, {maximumSignificantDigits});
}

/**
 * Formats a number with an abbreviation and rounds to 2
 * decimal digits without forcing trailing zeros.
 * e. g. 1000 -> 1k, 1234 -> 1.23k
 */
export function formatAbbreviatedNumberWithDynamicPrecision(
  value: number | string
): string {
  const number = Number(value);

  if (number === 0) {
    return '0';
  }

  const log10 = Math.log10(Math.abs(number));
  // numbers less than 1 will have a negative log10
  const numOfDigits = log10 < 0 ? 1 : Math.floor(log10) + 1;

  const maxStep = numberFormatSteps[0][0];

  // if the number is larger than the largest step, we determine the number of digits
  // by dividing the number by the largest step, otherwise the number of formatted
  // digits is the number of digits in the number modulo 3 (the number of zeroes between steps)
  const numOfFormattedDigits =
    number > maxStep
      ? Math.floor(Math.log10(number / maxStep))
      : Math.max(numOfDigits % 3 === 0 ? 3 : numOfDigits % 3, 0);

  const maximumSignificantDigits = numOfFormattedDigits + 2;

  return formatAbbreviatedNumber(value, maximumSignificantDigits, true);
}

/**
 * Rounds to specified number of decimal digits (defaults to 2) without forcing trailing zeros
 * Will preserve significant decimals for very small numbers
 * e.g. 0.0001234 -> 0.00012
 * @param value number to format
 */
export function formatNumberWithDynamicDecimalPoints(
  value: number,
  maxFractionDigits = 2
): string {
  if ([0, Infinity, -Infinity, NaN].includes(value)) {
    return value.toLocaleString();
  }

  const exponent = Math.floor(Math.log10(Math.abs(value)));

  const maximumFractionDigits =
    exponent >= 0 ? maxFractionDigits : Math.abs(exponent) + 1;
  const numberFormat = {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  };

  return value.toLocaleString(undefined, numberFormat);
}

export function formatRate(
  value: number,
  unit: RateUnit = RateUnit.PER_SECOND,
  options: {
    minimumValue?: number;
    significantDigits?: number;
  } = {}
) {
  // NOTE: `Intl` doesn't support unitless-per-unit formats (i.e.,
  // `"-per-minute"` is not valid) so we have to concatenate the unit manually, since our rates are usually just "/min" or "/s".
  // Because of this, the unit is not internationalized.

  // 0 is special!
  if (value === 0) {
    return `${0}${RATE_UNIT_LABELS[unit]}`;
  }

  const minimumValue = options.minimumValue ?? 0;
  const significantDigits = options.significantDigits ?? 3;

  const numberFormatOptions: ConstructorParameters<typeof Intl.NumberFormat>[1] = {
    notation: 'compact',
    compactDisplay: 'short',
    minimumSignificantDigits: significantDigits,
    maximumSignificantDigits: significantDigits,
  };

  if (value <= minimumValue) {
    return `<${minimumValue}${RATE_UNIT_LABELS[unit]}`;
  }

  return `${value.toLocaleString(undefined, numberFormatOptions)}${
    RATE_UNIT_LABELS[unit]
  }`;
}

export function formatSpanOperation(
  operation?: string,
  length: 'short' | 'long' = 'short'
) {
  if (length === 'long') {
    return getLongSpanOperationDescription(operation);
  }

  return getShortSpanOperationDescription(operation);
}

function getLongSpanOperationDescription(operation?: string) {
  if (operation?.startsWith('http')) {
    return t('URL request');
  }

  if (operation === 'db.redis') {
    return t('cache query');
  }

  if (operation?.startsWith('db')) {
    return t('database query');
  }

  if (operation?.startsWith('task')) {
    return t('application task');
  }

  if (operation?.startsWith('serialize')) {
    return t('serializer');
  }

  if (operation?.startsWith('middleware')) {
    return t('middleware');
  }

  if (operation === 'resource') {
    return t('resource');
  }

  if (operation === 'resource.script') {
    return t('JavaScript file');
  }

  if (operation === 'resource.css') {
    return t('stylesheet');
  }

  if (operation === 'resource.img') {
    return t('image');
  }

  return t('span');
}

function getShortSpanOperationDescription(operation?: string) {
  if (operation?.startsWith('http')) {
    return t('request');
  }

  if (operation?.startsWith('db')) {
    return t('query');
  }

  if (operation?.startsWith('task')) {
    return t('task');
  }

  if (operation?.startsWith('serialize')) {
    return t('serializer');
  }

  if (operation?.startsWith('middleware')) {
    return t('middleware');
  }

  if (operation?.startsWith('resource')) {
    return t('resource');
  }

  return t('span');
}
