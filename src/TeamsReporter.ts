import WDIOReporter, { RunnerStats, SuiteStats, TestStats } from '@wdio/reporter';
import { Reporters } from '@wdio/types';
import getLogger from '@wdio/logger';
import path from 'path';
import { LogLevelDesc } from 'loglevel';
import chalk from 'chalk';
import https from "https";
import { getAdaptiveCardv1_4 } from './utils.js';

const logger = getLogger('TeamsReporter');


export interface TeamsReporterOptions extends Partial<Reporters.Options> {
    url: string;
    /**
     * Sync Job interval time in ms
     * @default 5000 ms
     */
    interval?: number;
    /**
     * API Rate limit. 
     * @default 1000 ms
     */
    rateLimit?: number;
    /**
     * @default DEBUG
     */
    logLevel?: LogLevelDesc;
    /**
     * Additional options to be passed with json payload
     */
    payloadOptions?: Record<string, string>; 
}

export interface TeamsReporterSuite {
    /**
     * Scenario description
     */
    title: string;
    metrics: TeamsReporterSuiteMetrics;
    start: Date;
    end?: Date;
}

export interface TeamsReporterSuiteMetrics {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    retriedTests: number;
}

export default class TeamsReporter extends WDIOReporter {

    private results: Record<string, TeamsReporterSuite[]> = {};
    private currentParentSuite?: TeamsReporterSuite;
    private currentSuit?: TeamsReporterSuite;
    private readonly webhookEnabled: boolean = false;
    private readonly webhookURL!: string;
    private readonly publishQueue: TeamsReporterSuite[] = [];
    private isUploading = false;
    private runnerEnded = false;
    private readonly interval!: NodeJS.Timeout;
    private readonly url!: string;
    private readonly rateLimit!: number;
    private readonly payloadOptions!: Record<string,string>;

    constructor(options: TeamsReporterOptions) {
        super(options);

        this.decorateLoggerFactory();
        logger.setLevel(options.logLevel ?? 'DEBUG');
        logger.trace(this.logPrefix("constructor"), JSON.stringify(options));
        
        if(options.url !== undefined || options.url !== ''){
            this.webhookEnabled = true;
            this.url = options.url;
            this.interval = setInterval(this.publishCurrentParentSuiteReport.bind(this),options.interval ?? 5000);
            this.rateLimit = options.rateLimit ?? 1000;
            this.payloadOptions = options.payloadOptions ?? {};
        }
    }

    get isSynchronised(): boolean{
        return (this.publishQueue.length === 0) && (this.isUploading === false);
    }

    private decorateLoggerFactory(): void {
        const context = this;
        const originalFactory = logger.methodFactory;
        logger.methodFactory = function (methodName, logLevel, loggerName) {
            const rawMethod = originalFactory(methodName, logLevel, loggerName);
            return function (...message) {
                context.outputStream.write([...message, "\n"].join(" "));
                rawMethod(message);
            };
        };
    }

    private logPrefix(module: string) {
        return `[TeamsReporter.${module}]`;
    }

    private getGroupedResultName(file: string): string {
        const groupName = path.basename(file);
        logger.trace(this.logPrefix("getGroupedResultName"), groupName);
        return groupName;
    }

    private groupExists(groupName: string): boolean {
        const result = this.results[groupName] !== undefined;
        logger.trace(this.logPrefix("groupExists"), groupName, result);
        return result;
    }

    private initializeGroupedResult(groupName: string): void {
        this.results[groupName] = [];
        logger.debug(this.logPrefix("initializeGroupedResult"), groupName);
    }

    private isRootSuite(suiteStats: SuiteStats) {
        const result = suiteStats.parent === undefined || suiteStats.parent === '';
        logger.trace(this.logPrefix("isRootSuite"), JSON.stringify(suiteStats), result);
        return result;
    }

    onSuiteStart(suiteStats: SuiteStats): void {
        logger.trace(this.logPrefix("onSuiteStart"), JSON.stringify(suiteStats));
        const groupName = this.getGroupedResultName(suiteStats.file);
        if (this.isRootSuite(suiteStats) && this.currentParentSuite === undefined) {
            if (!this.groupExists(groupName)) {
                this.initializeGroupedResult(groupName);
            }
            this.currentSuit = {
                title: suiteStats.title,
                metrics: {
                    totalTests: 0,
                    passedTests: 0,
                    failedTests: 0,
                    skippedTests: 0,
                    retriedTests: 0
                },
                start: suiteStats.start,
                end: suiteStats.end
            };
            this.currentParentSuite = this.currentSuit;
            logger.debug(this.logPrefix("onSuiteStart"), suiteStats.title);
            this.results[groupName].push(this.currentSuit);
        }
    }

    onSuiteEnd(suiteStats: SuiteStats): void {
        logger.debug(this.logPrefix("onSuiteEnd"), suiteStats.title);
        if (this.isRootSuite(suiteStats)) {
            const parentSuite = this.getCurrentParentSuite();
            parentSuite.end = suiteStats.end;
            const metrics = parentSuite.metrics;
            metrics.totalTests = metrics.passedTests + metrics.failedTests - metrics.retriedTests;
            this.addToPublishQueue();
            this.publishCurrentParentSuiteReport();
            this.currentParentSuite = undefined;
        }
    }

    onRunnerEnd(runnerStats: RunnerStats): void {
        super.onRunnerEnd(runnerStats);
        this.runnerEnded = true;
    }

    private addToPublishQueue(): void{
        this.publishQueue.push(this.getCurrentParentSuite());
    }

    private async publishCurrentParentSuiteReport(): Promise<void> {
        if(!this.webhookEnabled) return;
        if(this.runnerEnded && this.publishQueue.length === 0) clearInterval(this.interval);
        if(this.isUploading || this.publishQueue.length === 0) return;
        this.isUploading = true;
        logger.debug(this.logPrefix("publishCurrentParentSuiteReport"), "Starting uploading");
        while(this.publishQueue.length >0 ){
            const payloadJSON = {
                timestamp: new Date().toISOString(),
                options: JSON.stringify(this.payloadOptions),
                data: JSON.stringify(getAdaptiveCardv1_4(this.publishQueue[0]))
            };
            const payload = JSON.stringify(payloadJSON);
            const responseCode = await new Promise((resolve,reject)=>{
                const request = https.request(this.url, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': payload.length,
                    }
                },(res)=>{
                    setTimeout(()=>{
                        resolve(res.statusCode)
                    },this.rateLimit);
                    resolve(res.statusCode);
                });
                request.on('error',reject);
                request.write(payload);
                request.end();
            });
            logger.debug(this.logPrefix("publishCurrentParentSuiteReport"), responseCode);
            this.publishQueue.splice(0,1);
        }
        this.isUploading = false;
        logger.debug(this.logPrefix("publishCurrentParentSuiteReport"), "Uploading done");
    }

    onTestPass(testStats: TestStats): void {
        logger.debug(this.logPrefix('onTestPass'), "Test passed", JSON.stringify(testStats));
        this.getCurrentParentSuiteMetrics().passedTests++;
    }
    onTestFail(testStats: TestStats): void {
        logger.debug(this.logPrefix('onTestFail'), "Test failed", JSON.stringify(testStats));
        this.getCurrentParentSuiteMetrics().failedTests++;
    }
    onTestRetry(testStats: TestStats): void {
        logger.debug(this.logPrefix('onTestRetry'), "Retrying test", JSON.stringify(testStats));
        this.getCurrentParentSuiteMetrics().retriedTests++;
    }
    onTestSkip(testStats: TestStats): void {
        logger.debug(this.logPrefix('onTestSkip'), "Test skipped", JSON.stringify(testStats));
        this.getCurrentParentSuiteMetrics().skippedTests++;
        console.log(chalk.yellowBright("SKIPPED", testStats.title));
    }

    private getCurrentParentSuite(): TeamsReporterSuite {
        if (this.currentParentSuite)
            return this.currentParentSuite;
        throw new Error('Current Parent Suite is not defined');
    }

    private getCurrentParentSuiteMetrics(): TeamsReporterSuiteMetrics {
        const metrics = this.getCurrentParentSuite().metrics;
        if (metrics)
            return metrics;
        throw new Error(`Metrics are not defined in Current Parent Suite ${this.getCurrentParentSuite().title}`);
    }
}
