import { IInputs, IOutputs } from "./generated/ManifestTypes";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import "./css/HTMLToPDFControl.css";

export class HTMLToPDFControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    private button: HTMLButtonElement;
    private recordId: string | null | undefined;
    private buttonLabel: string | null | undefined;
    private htmlFieldSchemaName: string | null | undefined;
    private entityLogicalName: string | null | undefined;
    private notifyOutputChanged: () => void;
    private context: ComponentFramework.Context<IInputs>;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.container = container;

        // Create and configure the button
        this.button = document.createElement("button");
        this.button.className = "pdf-button";
        this.button.addEventListener("click", this.downloadPdf.bind(this));
        this.container.appendChild(this.button);

        // Set initial values
        this.setPropertiesFromContext(context);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        this.setPropertiesFromContext(context);

        // Update button text
        this.button.innerText = this.buttonLabel || "Download PDF";
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.button.removeEventListener("click", this.downloadPdf);
    }

    private setPropertiesFromContext(context: ComponentFramework.Context<IInputs>): void {
        this.recordId = context.parameters.recordId?.raw;
        this.buttonLabel = context.parameters.generatePDF?.raw;
        this.htmlFieldSchemaName = context.parameters.htmlFieldSchemaName?.raw;
        this.entityLogicalName = context.parameters.entityLogicalName?.raw;
    }

    private async downloadPdf(): Promise<void> {
        const recordId = this.recordId?.replace(/[{}]/g, "");
        const entityName = this.entityLogicalName;
        const fieldName = this.htmlFieldSchemaName;
    
        if (!recordId || !entityName || !fieldName) {
            alert("Missing record ID, entity logical name, or HTML field schema name.");
            return;
        }
        try {
            const result = await this.context.webAPI.retrieveRecord(entityName, recordId, `?$select=${fieldName}`);
            let htmlContent: string = result[fieldName];
    
            if (!htmlContent || typeof htmlContent !== "string") {
                alert("No valid HTML content found in the specified field.");
                return;
            }
    
            htmlContent = htmlContent.trim();
    
            // Create a temp container for rendering
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = htmlContent;
            tempDiv.style.position = "fixed";
            tempDiv.style.left = "-9999px";
            tempDiv.style.top = "0";
            tempDiv.style.width = "800px"; // suitable width for A4
            tempDiv.style.backgroundColor = "white"; // ensure white bg
            document.body.appendChild(tempDiv);
    
            // Wait to ensure styles apply
            await new Promise(resolve => setTimeout(resolve, 300));
    
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: true,
            });
    
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
    
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
            // Add image to PDF
            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight > pageHeight ? pageHeight : imgHeight);
            pdf.save(`record_${recordId}.pdf`);
    
            document.body.removeChild(tempDiv);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("An error occurred while generating the PDF.");
        }
    }    
}
