/*******************************************************************************
 * Copyright (c) 2023 - 2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse   License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { XMLElement } from "typesxml";
import { MTEngine } from "./MTEngine";
import { MTMatch } from "./MTMatch";
import { Language, LanguageUtils } from "typesbcp47";
import Anthropic from '@anthropic-ai/sdk';
import { MTUtils } from "./MTUtils";

export class AnthropicTranslator implements MTEngine {

    // Claude 4 Models
    static readonly CLAUDE_OPUS_4: string = "claude-opus-4-0";
    static readonly CLAUDE_SONNET_4: string = "claude-sonnet-4-0";

    // Claude 3.7 Models

    static readonly CLAUDE_SONNET_3_7: string = "claude-3-7-sonnet-latest";

    // Claude 3.5 Models
    static readonly CLAUDE_HAIKU_3_5: string = "claude-3-5-haiku-latest";
    static readonly CLAUDE_SONNET_3_5: string = "claude-3-5-sonnet-latest";

    // Claude 3 Models
    static readonly CLAUDE_HAIKU_3_0: string = "claude-3-haiku-20240307";
    static readonly CLAUDE_SONNET_3_0: string = "claude-3-sonnet-20240229";
    static readonly CLAUDE_OPUS_3_0: string = "claude-3-opus-latest";

    apiKey: string;
    model: string;
    anthropic: Anthropic;
    srcLang: string;
    tgtLang: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model ? model : 'claude-3-5-sonnet-latest';
        this.anthropic = new Anthropic({ apiKey: this.apiKey });
    }

    getName(): string {
        return 'Anthropic Claude';
    }

    getShortName(): string {
        return 'Anthropic';
    }

    getRole(): string {
        let srcLanguage: string = LanguageUtils.getLanguage(this.srcLang, 'en').description;
        let tgetLanguage: string = LanguageUtils.getLanguage(this.tgtLang, 'en').description;
        return 'You are an expert translator from ' + srcLanguage + ' to ' + tgetLanguage + ' with expert knowledge of XLIFF 2.1 formatting and best practices.';
    }

    getModels(): string[] {
        let models: string[] = [
            AnthropicTranslator.CLAUDE_OPUS_4,
            AnthropicTranslator.CLAUDE_SONNET_4,
            AnthropicTranslator.CLAUDE_SONNET_3_7,
            AnthropicTranslator.CLAUDE_SONNET_3_7,
            AnthropicTranslator.CLAUDE_HAIKU_3_5,
            AnthropicTranslator.CLAUDE_SONNET_3_5,
            AnthropicTranslator.CLAUDE_HAIKU_3_0,
            AnthropicTranslator.CLAUDE_SONNET_3_0,
            AnthropicTranslator.CLAUDE_OPUS_3_0
        ];
        models.sort((a: string, b: string) => {
            return a.localeCompare(b, 'en');
        });
        return models;
    }

    getLanguages(): Promise<string[]> {
        // Claude should support any language, but we'll limit it to 
        // the common ones supported by the TypesBCP47 library
        return new Promise<string[]>((resolve, reject) => {
            try {
                let languages: Language[] = LanguageUtils.getCommonLanguages('en');
                let result: string[] = [];
                for (let language of languages) {
                    result.push(language.code);
                }
                resolve(result);
            } catch (error) {
                if (error instanceof Error) {
                    reject(error);
                    return;
                }
                reject(error as Error);
            }
        });
    }

    getSourceLanguages(): Promise<string[]> {
        return this.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return this.getLanguages();
    }

    setSourceLanguage(lang: string): void {
        this.srcLang = lang;
    }

    getSourceLanguage(): string {
        return this.srcLang;
    }

    setTargetLanguage(lang: string): void {
        this.tgtLang = lang;
    }

    getTargetLanguage(): string {
        return this.tgtLang;
    }

    translate(source: string): Promise<string> {
        let propmt: string = this.getRole() + ' Accurately translate the text enclosed in triple quotes from ' +
            LanguageUtils.getLanguage(this.srcLang, 'en').description + ' to ' + LanguageUtils.getLanguage(this.tgtLang, 'en').description +
            ' preserving the meaning, tone, and nuance of the original text. """' + source +
            '""". Provide only the requested translation without any additional commentary or explanation.';
        return new Promise<string>(async (resolve, reject) => {
            try {
                this.createMessage(propmt).then((message: Anthropic.Message) => {
                    let jsonString: string = JSON.stringify(message, null, 2);
                    let jsonObject: any = JSON.parse(jsonString);
                    let translation: string = jsonObject.content[0].text;
                    if (translation.startsWith('"""') && translation.endsWith('"""')) {
                        translation = translation.substring(3, translation.length - 3).trim();
                    }
                    resolve(translation);
                }).catch((error: Error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error as Error);
            }
        });
    }

    getMTMatch(source: XMLElement): Promise<MTMatch> {
        let propmt: string = this.getRole() + ' Given the following <source> XML element from an XLIFF 2.1 document:\n\n' +
            source.toString() + '\n\n' +
            'Generate the corresponding <target> XML element that would accurately translate the text from ' +
            LanguageUtils.getLanguage(this.srcLang, 'en').description + ' to ' +
            LanguageUtils.getLanguage(this.tgtLang, 'en').description + '.\n\n' +
            'Provide the <target> XML element in the same format as the <source> element, preserving the structure and attributes.\n\n' +
            'Ensure that the translation is accurate and maintains the meaning, tone, and nuance of the original text.\n\n' +
            'Provide only the <target> XML element without any additional commentary or explanation.';
        return new Promise<MTMatch>(async (resolve, reject) => {
            try {
                this.createMessage(propmt).then((message: Anthropic.Message) => {
                    let jsonString: string = JSON.stringify(message, null, 2);
                    let jsonObject: any = JSON.parse(jsonString);
                    let translation: string = jsonObject.content[0].text;
                    let target: XMLElement = MTUtils.toXMLElement(translation);
                    if (source.hasAttribute('xml:space')) {
                        target.setAttribute(source.getAttribute('xml:space'));
                    }
                    resolve(new MTMatch(source, target, this.getShortName()));
                }).catch((error: Error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error as Error);
            }
        });
    }

    async createMessage(source: string): Promise<Anthropic.Message> {
        return await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: "user", content: source }],
        });
    }

    handlesTags(): boolean {
        return true;
    }

    fixesMatches(): boolean {
        return true;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        let propmt: string = this.getRole() + 'The following "Target XML" is the translation of "Source XML".\n\n' +

            'Target XML: ' + matchTarget.toString() + `\n` +
            'Source XML: ' + matchSource.toString() + '\n\n' +

            'The following "New XML" is similar to "Source XML".\n\n' +

            'New XML: ' + originalSource.toString() + '\n\n' +

            'Translate the content of "New XML" so that the translation is phrased similarly to the content of "Target XML" but is an accurate translation of "New XML".\n' +
            'Provide only the requested translation in the same XML format as "Target XML" and do not add any additional text. Make sure the translation is valid XML and does not contain any XML errors.';
        return new Promise<MTMatch>(async (resolve, reject) => {
            try {
                this.createMessage(propmt).then((message: Anthropic.Message) => {
                    let jsonString: string = JSON.stringify(message, null, 2);
                    let jsonObject: any = JSON.parse(jsonString);
                    let translation: string = jsonObject.content[0].text;
                    let target: XMLElement = MTUtils.toXMLElement(translation);
                    if (originalSource.hasAttribute('xml:space')) {
                        target.setAttribute(originalSource.getAttribute('xml:space'));
                    }
                    resolve(new MTMatch(originalSource, target, this.getShortName()));
                }).catch((error: Error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error as Error);
            }
        });
    }

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        let lang: string = this.tgtLang.indexOf('-') > 0 ? this.tgtLang.substring(0, this.tgtLang.indexOf('-')) : this.tgtLang;
        let tgetLanguage: string = LanguageUtils.getLanguage(lang, 'en').description;
        let propmt: string = 'Given the following <source> and <target> XML elements from an XLIFF 2.1 document:\n\n' +

            source.toString() + '\n' +
            target.toString() + '\n\n' +

            'The <target> element is missing required inline elements.\n' +

            'Your task is to revise the <target> so that:\n' +
            '	•	All inline elements from the <source> appear in the corrected <target>, in the appropriate grammatical and semantic positions for accurate' + tgetLanguage + '.\n' +
            '	•	The translation remains fluent and faithful to the source meaning.\n' +
            '	•	Do not add, omit, or reorder any inline elements.\n' +
            '	•	Do not change the Japanese text.\n' +
            '	•	Do not include any explanation or comments, return only the corrected <target> element.\n' +

            'Provide only the corrected <target> element in your response.\n';

        return new Promise<XMLElement>(async (resolve, reject) => {
            try {
                this.createMessage(propmt).then((message: Anthropic.Message) => {
                    let jsonString: string = JSON.stringify(message, null, 2);
                    let jsonObject: any = JSON.parse(jsonString);
                    let translation: string = jsonObject.content[0].text;
                    let target: XMLElement = MTUtils.toXMLElement(translation);
                    if (source.hasAttribute('xml:space')) {
                        target.setAttribute(source.getAttribute('xml:space'));
                    }
                    resolve(target);
                }).catch((error: Error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error as Error);
            }
        });
    }
}