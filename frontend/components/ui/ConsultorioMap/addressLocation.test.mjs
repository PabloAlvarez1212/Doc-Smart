import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicAddress,validateClinicCity} from './addressLocation.mjs';
const city={id:1,nombre:'Medellín',departamento:'Antioquia'};
const component=(type,longText,shortText=longText)=>({types:[type],longText,shortText});
const parts=[component('route','Calle 64','Cl. 64'),component('street_number','50A-67'),component('neighborhood','La Candelaria'),component('locality','Medellín'),component('administrative_area_level_1','Antioquia'),component('country','Colombia','CO')];
test('partial street can preview its city but cannot be saved without a street number',()=>{
 const partial=parts.filter(p=>!p.types.includes('street_number'));
 assert.doesNotThrow(()=>validateClinicCity(partial,city));
 assert.throws(()=>clinicAddress(partial,city),/calle y número/);
 assert.throws(()=>validateClinicCity(partial,{...city,nombre:'Bello'}),/no corresponde/);
});
test('stores only street/number and neighborhood, without repeated city/department/country',()=>assert.equal(clinicAddress(parts,city).direccion,'Cl. 64 #50A-67, La Candelaria'));
test('rejects a different city, department, country and incomplete addresses',()=>{
 assert.throws(()=>clinicAddress(parts,{...city,nombre:'Riohacha'}),/no corresponde/);
 assert.throws(()=>clinicAddress(parts,{...city,departamento:'Caldas'}),/no corresponde/);
 assert.throws(()=>clinicAddress(parts.filter(p=>!p.types.includes('country')),city),/Colombia/);
 assert.throws(()=>clinicAddress(parts.filter(p=>!p.types.includes('street_number')),city),/calle y número/);
});
test('never invents a missing neighborhood and accepts reverse geocoder components',()=>{
 assert.equal(clinicAddress(parts.filter(p=>!p.types.includes('neighborhood')),city).direccion,'Cl. 64 #50A-67');
 assert.equal(clinicAddress(parts.map(p=>({types:p.types,long_name:p.longText,short_name:p.shortText})),city).direccion,'Cl. 64 #50A-67, La Candelaria');
});
test('Bogotá names and accents normalize without accepting a neighboring municipality',()=>{
 const bogota=parts.map(p=>p.types.includes('locality')||p.types.includes('administrative_area_level_1')?component(p.types[0],'Bogotá'):p);
 assert.ok(clinicAddress(bogota,{id:2,nombre:'Bogotá, D.C.',departamento:'Bogotá D.C.'}));
 assert.throws(()=>clinicAddress(bogota,{id:3,nombre:'Soacha',departamento:'Cundinamarca'}),/no corresponde/);
});
