/*******************************************************************************
 * Copyright (c) 2023 - 2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
import { Language, LanguageUtils } from "typesbcp47";
import { TextNode, XMLElement, SAXParser, DOMBuilder } from "typesxml";

export class MTUtils {

    static getElementContent(e: XMLElement): string {
        let content: string = '';
        for (let node of e.getContent()) {
            content += node.toString();
        }
        return content;
    }

    static plainText(e: XMLElement): string {
        let text: string = '';
        for (let node of e.getContent()) {
            if (node instanceof XMLElement) {
                text += node.getText();
            } else if (node instanceof TextNode) {
                text += node.toString();
            }
        }
        return text;
    }

    static toXMLElement(text: string): XMLElement {
        let parser: SAXParser = new SAXParser();
        let builder: DOMBuilder = new DOMBuilder();
        parser.setContentHandler(builder);
        parser.parseString(text);
        return builder.getDocument().getRoot();
    }

    static getRole(srcLang: string, tgtLang: string): string {
        let srcLanguage: string = LanguageUtils.getLanguage(srcLang, 'en').description;
        let tgetLanguage: string = LanguageUtils.getLanguage(tgtLang, 'en').description;
        return 'You are an expert translator from ' + srcLanguage + ' to ' + tgetLanguage + ' with expert knowledge of XLIFF 2.1 formatting and best practices.';
    }

    static translatePropmt(source: string, srcLang: string, tgtLang: string): string {
        return 'Accurately translate the text enclosed in triple quotes from ' +
            LanguageUtils.getLanguage(srcLang, 'en').description + ' to ' + LanguageUtils.getLanguage(tgtLang, 'en').description +
            ' preserving the meaning, tone, and nuance of the original text.\n\n """' + source +
            '""" \n\n Provide only the requested translation without any additional commentary or explanation.';;
    }

    static generatePrompt(source: XMLElement, srcLang: string, tgtLang: string): string {
        let propmt: string = 'Given the following <source> XML element from an XLIFF 2.1 document:\n\n' +
            source.toString() + '\n\n' +
            'Generate the corresponding <target> XML element that would accurately translate the text from ' +
            LanguageUtils.getLanguage(srcLang, 'en').description + ' to ' +
            LanguageUtils.getLanguage(tgtLang, 'en').description + '.\n\n' +
            'Provide the <target> XML element in the same format as the <source> element, preserving the structure and attributes.\n\n' +
            'Ensure that the translation is accurate and maintains the meaning, tone, and nuance of the original text.\n\n' +
            'Provide only the <target> XML element without any additional commentary or explanation.';
        return propmt;
    }

    static fixTagsPrompt(source: XMLElement, target: XMLElement, srcLang: string, tgtLang: string): string {
        let lang: string = tgtLang.indexOf('-') > 0 ? tgtLang.substring(0, tgtLang.indexOf('-')) : tgtLang;
        let tgetLanguage: string = LanguageUtils.getLanguage(lang, 'en').description;
        return 'Given the following <source> and <target> XML elements from an XLIFF 2.1 document:\n\n' +

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
    }

    static fixMatchPrompt(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): string {
        return 'The following "Target XML" is the translation of "Source XML".\n\n' +

            'Target XML: ' + matchTarget.toString() + `\n` +
            'Source XML: ' + matchSource.toString() + '\n\n' +

            'The following "New XML" is similar to "Source XML".\n\n' +

            'New XML: ' + originalSource.toString() + '\n\n' +

            'Translate the content of "New XML" so that the translation is phrased similarly to the content of "Target XML" but is an accurate translation of "New XML".\n' +
            'Provide only the requested translation in the same XML format as "Target XML" and do not add any additional text. Make sure the translation is valid XML and does not contain any XML errors.';
    }

    static getLanguages(): Promise<string[]> {
        // AI tools should support any language, but we'll limit them to 
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
}