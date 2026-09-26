import type {
  DiagnoseResult,
  RootCauseResult,
  BoostResult,
  VerifyResult,
} from './domain.js';

export interface DiagnoseReportJson {
  readonly command: 'diagnose';
  readonly generatedAt: string;
  readonly result: DiagnoseResult;
}

export interface RootCauseReportJson {
  readonly command: 'analyze';
  readonly generatedAt: string;
  readonly result: RootCauseResult;
}

export interface BoostReportJson {
  readonly command: 'boost';
  readonly generatedAt: string;
  readonly result: BoostResult;
}

export interface VerifyReportJson {
  readonly command: 'verify';
  readonly generatedAt: string;
  readonly result: VerifyResult;
}

export interface ReportFiles {
  readonly jsonPath: string | null;
  readonly mdPath: string | null;
}

export interface MarkdownSection {
  readonly heading: string;
  readonly content: string;
}