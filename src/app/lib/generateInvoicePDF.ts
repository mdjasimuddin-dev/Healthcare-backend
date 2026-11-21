import PDFDocument from "pdfkit";

interface IInvoiceData {
	invoiceNumber: string;
	appointmentId: string;

	patient: {
		name: string;
		email: string;
		contactNumber: string | null;
		address: string | null;
	};

	doctor: {
		name: string;
		specialization: string;
		licenseNumber: string;
		consultationsFee: number;
	};

	schedule: {
		startDateTime: Date;
		endDateTime: Date;
	};

	paymentStatus?: string;
	generatedAt: Date;
}

export const generateInvoicePDF = (data: IInvoiceData): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({
				size: "A4",
				margin: 50,
			});

			const buffers: Buffer[] = [];

			doc.on("data", (chunk) => {
				buffers.push(chunk);
			});

			doc.on("end", () => {
				resolve(Buffer.concat(buffers));
			});

			doc.on("error", (error) => {
				reject(error);
			});

			// ==========================================
			// HEADER
			// ==========================================

			doc.fontSize(22).font("Helvetica-Bold").text("SMART HEALTHCARE LIMITED", {
				align: "center",
			});

			doc.moveDown(0.3);

			doc
				.fontSize(10)
				.font("Helvetica")
				.text("Your Trusted Digital Healthcare Partner", {
					align: "center",
				});

			doc.moveDown();

			doc.strokeColor("#000000").moveTo(50, doc.y).lineTo(545, doc.y).stroke();

			doc.moveDown();

			// ==========================================
			// INVOICE TITLE
			// ==========================================

			doc.fontSize(20).font("Helvetica-Bold").text("APPOINTMENT INVOICE", {
				align: "center",
			});

			doc.moveDown(1.5);

			// ==========================================
			// INVOICE INFORMATION
			// ==========================================

			doc.fontSize(10).font("Helvetica-Bold");

			doc.text(`Invoice No: ${data.invoiceNumber}`);

			doc.text(`Appointment ID: ${data.appointmentId}`);

			doc.text(`Invoice Date: ${data.generatedAt.toLocaleDateString()}`);

			doc.moveDown();

			// ==========================================
			// PATIENT INFORMATION
			// ==========================================

			doc.fontSize(13).font("Helvetica-Bold").text("PATIENT INFORMATION");

			doc.moveDown(0.5);

			doc.fontSize(10).font("Helvetica");

			doc.text(`Name: ${data.patient.name}`);

			doc.text(`Email: ${data.patient.email}`);

			doc.text(`Phone: ${data.patient.contactNumber || "N/A"}`);

			doc.text(`Address: ${data.patient.address || "N/A"}`);

			doc.moveDown(1);

			// ==========================================
			// DOCTOR INFORMATION
			// ==========================================

			doc.fontSize(13).font("Helvetica-Bold").text("DOCTOR INFORMATION");

			doc.moveDown(0.5);

			doc.fontSize(10).font("Helvetica");

			doc.text(`Doctor: ${data.doctor.name}`);

			doc.text(`Specialization: ${data.doctor.specialization}`);

			doc.text(`License Number: ${data.doctor.licenseNumber}`);

			doc.moveDown(1);

			// ==========================================
			// APPOINTMENT DETAILS
			// ==========================================

			doc.fontSize(13).font("Helvetica-Bold").text("APPOINTMENT DETAILS");

			doc.moveDown(0.5);

			doc.fontSize(10).font("Helvetica");

			doc.text(
				`Appointment Date: ${data.schedule.startDateTime.toLocaleDateString()}`,
			);

			doc.text(
				`Start Time: ${data.schedule.startDateTime.toLocaleTimeString()}`,
			);

			doc.text(`End Time: ${data.schedule.endDateTime.toLocaleTimeString()}`);

			doc.moveDown(1.5);

			// ==========================================
			// PAYMENT SUMMARY
			// ==========================================

			doc.fontSize(13).font("Helvetica-Bold").text("PAYMENT SUMMARY");

			doc.moveDown(0.5);

			const fee = data.doctor.consultationsFee;

			doc.fontSize(10).font("Helvetica");

			doc.text(`Consultation Fee: BDT ${fee.toFixed(2)}`);

			doc.moveDown(0.5);

			doc
				.fontSize(14)
				.font("Helvetica-Bold")
				.text(`TOTAL: BDT ${fee.toFixed(2)}`, {
					align: "right",
				});

			doc.moveDown(0.5);

			doc
				.fontSize(10)
				.font("Helvetica")
				.text(`Payment Status: ${data.paymentStatus || "PENDING"}`, {
					align: "right",
				});

			doc.moveDown(2);

			// ==========================================
			// FOOTER
			// ==========================================

			doc.strokeColor("#000000").moveTo(50, doc.y).lineTo(545, doc.y).stroke();

			doc.moveDown();

			doc
				.fontSize(9)
				.font("Helvetica")
				.text("Thank you for choosing Smart Healthcare Limited.", {
					align: "center",
				});

			doc.moveDown(0.5);

			doc
				.fontSize(8)
				.text(
					"This is a system-generated invoice and does not require a signature.",
					{
						align: "center",
					},
				);

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
};
