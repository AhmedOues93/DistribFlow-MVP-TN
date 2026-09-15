import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createCustomer, createProduct } from "@/lib/services/catalog";
import type { Role } from "@/lib/tenant";

type Context={tenantId?:string;role:Role;userId?:string};
const maxBytes=512*1024;
const customerHeaders=["nom","telephone","whatsapp","matricule_fiscal","limite_credit","delai_paiement"];
const productHeaders=["sku","code_barres","nom","unite","prix_achat","prix_vente","tva","stock_minimum"];
const parse=(text:string)=>text.trim().split(/\r?\n/).map(line=>line.split(",").map(value=>value.trim()));
export function csvTemplate(kind:"customers"|"products"){return `${(kind==="customers"?customerHeaders:productHeaders).join(",")}\n`;}
export async function previewImport(kind:"customers"|"products",text:string,ctx:Context){if(Buffer.byteLength(text,"utf8")>maxBytes)throw new Error("Le fichier dépasse la limite de 512 Ko");const rows=parse(text);const expected=kind==="customers"?customerHeaders:productHeaders;if(!rows.length||rows[0].join(",")!==expected.join(","))throw new Error("Les en-têtes CSV ne correspondent pas au modèle");const errors:{row:number;field:string;value:string;message:string}[]=[];for(const [index,row] of rows.slice(1).entries()){if(row.length!==expected.length)errors.push({row:index+2,field:"ligne",value:row.join(","),message:"Nombre de colonnes invalide"});else if(!row[0])errors.push({row:index+2,field:expected[0],value:"",message:"Champ obligatoire"})}return{rows:Math.max(0,rows.length-1),errors,canConfirm:errors.length===0}}
export async function confirmImport(kind:"customers"|"products",text:string,ctx:Context){const preview=await previewImport(kind,text,ctx);if(!preview.canConfirm)return{created:0,skipped:preview.rows,errors:preview.errors};const rows=parse(text).slice(1),errors=[...preview.errors];let created=0;await prisma.importBatch.create({data:{tenantId:ctx.tenantId!,kind,createdById:ctx.userId??"system"}});for(const [index,row] of rows.entries()){try{if(kind==="customers")await createCustomer({name:row[0],phone:row[1]||undefined,whatsapp:row[2]||undefined,taxIdentifier:row[3]||undefined,creditLimit:row[4]||0,paymentTermsDays:row[5]||0},ctx);else await createProduct({sku:row[0],barcode:row[1]||undefined,name:row[2],unit:row[3],purchasePrice:row[4],sellingPrice:row[5],taxRate:row[6]||19,minimumStock:row[7]||0},ctx);created++}catch(error){errors.push({row:index+2,field:"ligne",value:row.join(","),message:error instanceof Error?error.message:"Erreur"})}}return{created,skipped:rows.length-created,errors}}
