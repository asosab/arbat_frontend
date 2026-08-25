/** ArcherySchool — vista administrativa. Equipos persistentes, fichas y listado de estudiantes. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';

  function styles(){
    if(document.getElementById('buddy-archery-school-admin-view-styles')) return;
    var s=document.createElement('style'); s.id='buddy-archery-school-admin-view-styles';
    s.textContent=[
      '.buddy-as-admin{font:inherit;display:grid;gap:18px;max-width:1150px}',
      '.buddy-as-admin section{border:1px solid #ddd;border-radius:12px;padding:18px}',
      '.buddy-as-admin form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}',
      '.buddy-as-admin label{display:grid;gap:6px}',
      '.buddy-as-admin input,.buddy-as-admin select,.buddy-as-admin textarea,.buddy-as-admin button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}',
      '.buddy-as-admin textarea{min-height:70px;resize:vertical}',
      '.buddy-as-admin .wide,.buddy-as-admin .status,.buddy-as-admin .actions{grid-column:1/-1}',
      '.buddy-as-admin .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.buddy-as-admin .status{min-height:1.3em}',
      '.buddy-as-admin .cards{display:grid;gap:10px;margin-top:14px}',
      '.buddy-as-admin article{border:1px solid #eee;border-radius:10px;padding:12px;display:grid;gap:8px}',
      '.buddy-as-admin article h4{margin:0}',
      '.buddy-as-admin .hint{opacity:.75;font-size:.92em}',
      '.buddy-as-admin .loading{opacity:.7}',
      '.buddy-as-admin .summary{margin:10px 0;padding:10px;border-radius:8px;background:#f7f7f7}',
      '.buddy-as-admin .empty{opacity:.7;padding:10px 0}',
      '.buddy-as-admin .selection{display:grid;gap:10px;padding:12px;border:1px dashed #ccc;border-radius:10px;margin:12px 0}',
      '.buddy-as-admin .student-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}',
      '.buddy-as-admin .student-card{border:1px solid #ddd;border-radius:12px;padding:14px;display:grid;gap:8px}',
      '.buddy-as-admin .student-card h4{margin:0}',
      '.buddy-as-admin .equipment-list{margin:0;padding-left:18px}',
      '.buddy-as-admin .pill{display:inline-block;padding:3px 7px;border-radius:999px;background:#f0f0f0;font-size:.85em}',
      '.buddy-as-admin .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}',
      '.buddy-as-admin .toolbar input{min-width:240px}',
      '.buddy-as-admin .danger{border-color:#c88}'
    ].join('');
    document.head.appendChild(s);
  }
  function add(form,label,name,value,type,required){
    var l=document.createElement('label');l.textContent=label;
    var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;
    if(required)i.required=true;l.appendChild(i);form.appendChild(l);return i;
  }
  function sel(form,label,name,options,value,required){
    var l=document.createElement('label');l.textContent=label;
    var s=document.createElement('select');s.name=name;
    var e=document.createElement('option');e.value='';e.textContent='Selecciona';s.appendChild(e);
    (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=x.value===String(value||'');s.appendChild(x);});
    if(required)s.required=true;l.appendChild(s);form.appendChild(l);return s;
  }
  function actions(form,text){
    var st=document.createElement('div');st.className='status';
    var a=document.createElement('div');a.className='actions';
    var b=document.createElement('button');b.type='submit';b.textContent=text;a.appendChild(b);
    form.appendChild(st);form.appendChild(a);return {status:st,button:b};
  }
  function value(item,key){return item&&item[key]!=null?item[key]:'';}
  function studentId(student){return student&&(student.personaId||student.id||student._id);}
  function studentName(student){return student&&(student.nombreCompleto||[student.nombre,student.apellido].filter(Boolean).join(' ')||student.name||student.email||studentId(student));}
  function ownerKey(owner){return owner.type==='empresa'?'empresa:'+owner.value:'persona:'+owner.value;}
  function equipmentId(item){return item&&(item.id||item._id);}
  function equipmentLabel(item){return [item&&item.tipo,item&&item.marca,item&&item.modelo,item&&item.numeroSerie].filter(Boolean).join(' · ')||'Equipo sin descripción';}
  function dateValue(v){return v?String(v).slice(0,10):'';}
  function label(options,value){var o=(options||[]).find(function(x){return String(x.value||x)===String(value||'');});return o?(o.label||o.value||o):value||'—';}

  window.BuddyArcherySchoolViews.admin=function(context){
    styles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{};
    target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-as-admin';
    var h=document.createElement('h2');h.textContent='Administración de ArcherySchool';root.appendChild(h);
    var hint=document.createElement('p');hint.className='hint';hint.textContent='Los equipos se registran una sola vez. Una asignación a un estudiante permanece vigente hasta que sea necesario cambiarla. No se registra el equipo de nuevo por cada clase.';root.appendChild(hint);

    var students=[];
    var schoolCompany=config.schoolOwnerCompany||config.schoolName||config.siteId||'escuela';
    var schoolOwner={type:'empresa',value:schoolCompany,label:'Escuela · '+schoolCompany};
    var selectedOwner=null,selectedEquipment=null,ownerEquipment=[];

    function studentById(id){return students.find(function(s){return String(studentId(s))===String(id);})||null;}
    function ownerLabel(owner){return owner&&owner.label||'';}
    function buildOwnerOptions(){
      var owners=[schoolOwner],seen={};seen[ownerKey(schoolOwner)]=true;
      students.forEach(function(s){var id=studentId(s);if(id){var o={type:'persona',value:id,label:studentName(s)};if(!seen[ownerKey(o)]){seen[ownerKey(o)]=true;owners.push(o);}}});
      return owners;
    }
    function setOptions(select,items,placeholder,mapper){
      select.innerHTML='';var p=document.createElement('option');p.value='';p.textContent=placeholder;select.appendChild(p);
      (items||[]).forEach(function(item){var o=document.createElement('option');var m=mapper?mapper(item):item;o.value=m.value;o.textContent=m.label;select.appendChild(o);});
    }
    function findOwner(key){return buildOwnerOptions().find(function(o){return ownerKey(o)===key;})||null;}
    function getOwnerEquipment(owner){return !owner?Promise.resolve([]):owner.type==='persona'?api.getEquipment({personaId:owner.value}):api.getEquipment({empresa:owner.value});}
    function equipmentData(fields){return {tipo:fields.tipo.value,marca:fields.marca.value.trim()||null,modelo:fields.modelo.value.trim()||null,numeroSerie:fields.numeroSerie.value.trim()||null,fechaAdquisicion:fields.fechaAdquisicion.value||null,fechaBaja:fields.fechaBaja.value||null,estado:fields.estado.value,notas:fields.notas.value.trim()||null};}
    function makeEquipmentFields(form){
      var f={};f.id=document.createElement('input');f.id.type='hidden';f.id.name='equipoId';form.appendChild(f.id);
      f.tipo=sel(form,'Tipo','tipo',config.equipmentTypes||[],'',true);f.marca=add(form,'Marca','marca','','text',false);f.modelo=add(form,'Modelo','modelo','','text',false);f.numeroSerie=add(form,'Número de serie','numeroSerie','','text',false);
      f.fechaAdquisicion=add(form,'Fecha de adquisición','fechaAdquisicion','','date',false);f.fechaBaja=add(form,'Fecha de baja','fechaBaja','','date',false);f.estado=sel(form,'Estado','estado',config.equipmentStates||[],'activo',true);f.notas=add(form,'Notas','notas','','text',false);return f;
    }
    function fillFields(f,item){f.id.value=equipmentId(item)||'';f.tipo.value=value(item,'tipo');f.marca.value=value(item,'marca');f.modelo.value=value(item,'modelo');f.numeroSerie.value=value(item,'numeroSerie');f.fechaAdquisicion.value=dateValue(value(item,'fechaAdquisicion'));f.fechaBaja.value=dateValue(value(item,'fechaBaja'));f.estado.value=value(item,'estado')||'activo';f.notas.value=value(item,'notas');}
    function resetFields(f){f.id.value='';f.tipo.value='';f.marca.value='';f.modelo.value='';f.numeroSerie.value='';f.fechaAdquisicion.value='';f.fechaBaja.value='';f.estado.value='activo';f.notas.value='';}

    /* INSCRIPCIÓN */
    var enrollment=document.createElement('section'),eh=document.createElement('h3');eh.textContent='Registro en la escuela';enrollment.appendChild(eh);var enHint=document.createElement('p');enHint.className='hint';enHint.textContent='Solo los administradores gestionan este registro. El estado controla si el estudiante aparece en las listas operativas; no indica si asiste actualmente a clases.';enrollment.appendChild(enHint);var ef=document.createElement('form');
    var enrollmentStudent=sel(ef,'Estudiante','personaId',[], '',true);
    add(ef,'Sitio','sitio',state.enrollment&&state.enrollment.sitio||config.siteId,'text',true);
    sel(ef,'Estado del registro','estado',config.enrollmentStates||[],state.enrollment&&state.enrollment.estado||'activo',true);
    add(ef,'Fecha de inscripción','fechaInscripcion',state.enrollment&&state.enrollment.fechaInscripcion,'date',true);
    var ea=actions(ef,state.enrollment?'Guardar inscripción':'Registrar inscripción');enrollment.appendChild(ef);
    ef.addEventListener('submit',function(e){e.preventDefault();var personaId=enrollmentStudent.value;if(!personaId){ea.status.textContent='Selecciona un estudiante.';return;}ea.button.disabled=true;var data={personaId:personaId,sitio:ef.elements.sitio.value.trim(),estado:ef.elements.estado.value,fechaInscripcion:ef.elements.fechaInscripcion.value||null};(state.enrollment?api.updateEnrollment(data):api.createEnrollment(data)).then(function(){
        var selected=studentById(personaId);
        if(selected){selected.enrollment={id:(state.enrollment&&state.enrollment.id)||('mock-enrollment-'+personaId),sitio:data.sitio,estado:data.estado,fechaInscripcion:data.fechaInscripcion};selected.estadoInscripcion=data.estado;selected.fechaInscripcion=data.fechaInscripcion;}
        ea.status.textContent='Registro guardado.';
        fillStudents();
        refreshStudentList();
      }).catch(function(err){ea.status.textContent=err.message;}).finally(function(){ea.button.disabled=false;});});
    root.appendChild(enrollment);

    /* MEDIDAS Y CARACTERÍSTICAS DEL ESTUDIANTE */
    var attrsSection=document.createElement('section'),attrsTitle=document.createElement('h3');
    attrsTitle.textContent='Medidas y características';attrsSection.appendChild(attrsTitle);
    var attrsHint=document.createElement('p');attrsHint.className='hint';
    attrsHint.textContent='Selecciona un estudiante para consultar y editar sus medidas y características de arquería.';
    attrsSection.appendChild(attrsHint);
    var attrsForm=document.createElement('form');
    var attrsStudent=sel(attrsForm,'Estudiante','personaId',[], '',true);
    var attrFields={};
    attrFields.altura=add(attrsForm,'Altura (cm)','altura','','number',false);
    attrFields.peso=add(attrsForm,'Peso (kg)','peso','','number',false);
    attrFields.lateralidad=sel(attrsForm,'Lateralidad','lateralidad',config.lateralidad||[],'',false);
    attrFields.genero=add(attrsForm,'Género','genero','','text',false);
    attrFields.aperturaBrazos=add(attrsForm,'Apertura de brazos (cm)','aperturaBrazos','','number',false);
    attrFields.aperturaArco=add(attrsForm,'Apertura de arco (cm)','aperturaArco','','number',false);
    attrFields.librajeActual=add(attrsForm,'Libraje actual (lbs)','librajeActual','','number',false);
    attrFields.variacionBase=add(attrsForm,'Variación base','variacionBase','','text',false);
    attrFields.posibilidadAdquisicion=sel(attrsForm,'Posibilidad de adquisición','posibilidadAdquisicion',config.posibilidadAdquisicion||[],'',false);
    attrFields.fuente=sel(attrsForm,'Fuente de los datos','fuente',config.attributeSources||[],'registrado_por_administrador',false);
    var aa=actions(attrsForm,'Guardar medidas y características');attrsSection.appendChild(attrsForm);

    function latestStudentAttribute(personaId,type){
      return (state.attributes||[]).filter(function(a){
        return a && String(a.personaId)===String(personaId) && a.tipo===type && !a.vigenteHasta;
      }).pop() || null;
    }
    function attrValue(personaId,type,key){
      var a=latestStudentAttribute(personaId,type);return a && a[key]!=null ? a[key] : '';
    }
    function loadStudentAttributes(personaId){
      Object.keys(attrFields).forEach(function(k){attrFields[k].value='';});
      if(!personaId)return;
      attrFields.altura.value=attrValue(personaId,'altura','valorCm');
      attrFields.peso.value=attrValue(personaId,'peso','valorKg');
      attrFields.lateralidad.value=attrValue(personaId,'lateralidad','valor');
      attrFields.genero.value=attrValue(personaId,'genero','valor');
      attrFields.aperturaBrazos.value=attrValue(personaId,'aperturaBrazos','valorCm');
      attrFields.aperturaArco.value=attrValue(personaId,'aperturaArco','valorCm');
      attrFields.librajeActual.value=attrValue(personaId,'librajeActual','valorLbs');
      attrFields.variacionBase.value=attrValue(personaId,'variacionBase','valor');
      attrFields.posibilidadAdquisicion.value=attrValue(personaId,'posibilidadAdquisicion','valor');
      var sources=['altura','peso','lateralidad','genero','aperturaBrazos','aperturaArco','librajeActual','variacionBase','posibilidadAdquisicion'];
      var found=null;
      sources.some(function(type){var a=latestStudentAttribute(personaId,type);if(a&&a.fuente){found=a.fuente;return true;}return false;});
      attrFields.fuente.value=found||'registrado_por_administrador';
      aa.status.textContent='';
    }
    attrsStudent.addEventListener('change',function(){loadStudentAttributes(attrsStudent.value);});
    attrsForm.addEventListener('submit',function(e){
      e.preventDefault();
      var personaId=attrsStudent.value;if(!personaId){aa.status.textContent='Selecciona un estudiante.';return;}
      aa.button.disabled=true;aa.status.textContent='Guardando…';
      var source=attrFields.fuente.value||'registrado_por_administrador',jobs=[];
      function save(type,key,cast){
        var field=attrFields[type],v=field.value;
        if(v===null||v==='')return;
        var existing=latestStudentAttribute(personaId,type);
        var d={personaId:personaId,tipo:type,fuente:source};
        d[key]=cast?cast(v):v;if(existing)d.id=existing.id||existing._id;
        jobs.push(api.setAttribute(d));
      }
      save('altura','valorCm',Number);save('peso','valorKg',Number);save('lateralidad','valor');save('genero','valor');
      save('aperturaBrazos','valorCm',Number);save('aperturaArco','valorCm',Number);save('librajeActual','valorLbs',Number);
      save('variacionBase','valor');save('posibilidadAdquisicion','valor');
      Promise.all(jobs).then(function(results){
        if(results.length){
          results.forEach(function(r){var item=r&&r.data;if(!item)return;var idx=(state.attributes||[]).findIndex(function(a){return String(a.id||a._id)===String(item.id||item._id);});if(idx>=0)state.attributes[idx]=item;else state.attributes.push(item);});
        }
        aa.status.textContent='Medidas y características guardadas.';
      }).catch(function(err){aa.status.textContent=err.message;}).finally(function(){aa.button.disabled=false;});
    });
    root.appendChild(attrsSection);

    enrollmentStudent.addEventListener('change',function(){
      var selected=studentById(enrollmentStudent.value);
      if(!selected) return;
      var enrollmentData=selected.enrollment||{personaId:studentId(selected),sitio:config.siteId,estado:selected.estadoInscripcion||'activo',fechaInscripcion:selected.fechaInscripcion||''};
      ef.elements.sitio.value=enrollmentData.sitio||config.siteId||'';
      ef.elements.estado.value=enrollmentData.estado||'activo';
      ef.elements.fechaInscripcion.value=dateValue(enrollmentData.fechaInscripcion);
      state.enrollment=enrollmentData;
      ea.button.textContent=enrollmentData.id?'Guardar cambios':'Registrar inscripción';
    });

    /* INVENTARIO DE LA ESCUELA */
    var schoolSection=document.createElement('section'),sh=document.createElement('h3');sh.textContent='Equipos de la escuela';schoolSection.appendChild(sh);
    var schoolHint=document.createElement('p');schoolHint.className='hint';schoolHint.textContent='Cada equipo de la escuela se registra una sola vez. Después puede quedar asignado a un estudiante durante el tiempo que corresponda y solo se cambia cuando sea necesario.';schoolSection.appendChild(schoolHint);
    var schoolForm=document.createElement('form'),schoolFields=makeEquipmentFields(schoolForm),schoolActions=actions(schoolForm,'Registrar equipo de la escuela');schoolSection.appendChild(schoolForm);
    var schoolCards=document.createElement('div');schoolCards.className='cards';schoolSection.appendChild(schoolCards);root.appendChild(schoolSection);
    function renderSchool(list){schoolCards.innerHTML='';if(!list.length){schoolCards.innerHTML='<div class="empty">No hay equipos de la escuela registrados.</div>';return;}list.forEach(function(item){var a=document.createElement('article'),t=document.createElement('h4');t.textContent=equipmentLabel(item);a.appendChild(t);var d=document.createElement('div');d.textContent='Estado: '+label(config.equipmentStates,item.estado)+' · Adquisición: '+(dateValue(item.fechaAdquisicion)||'—');a.appendChild(d);var b=document.createElement('button');b.type='button';b.textContent='Editar';b.onclick=function(){fillFields(schoolFields,item);schoolActions.button.textContent='Guardar cambios';schoolActions.status.textContent='Editando equipo de la escuela.';schoolForm.dataset.editingId=equipmentId(item)||'';schoolForm.scrollIntoView({behavior:'smooth',block:'nearest'});};a.appendChild(b);schoolCards.appendChild(a);});}
    function loadSchool(){return getOwnerEquipment(schoolOwner).then(renderSchool).catch(function(err){schoolCards.innerHTML='<div class="empty">No se pudo cargar: '+err.message+'</div>';});}
    schoolForm.addEventListener('submit',function(e){e.preventDefault();schoolActions.button.disabled=true;schoolActions.status.textContent='Guardando…';var editing=schoolForm.dataset.editingId,data=equipmentData(schoolFields);if(editing)data.id=editing;var op=editing?api.updateEquipment(data):api.createEquipment(data);op.then(function(r){var saved=(r&&r.data)||r||data,id=equipmentId(saved)||editing;if(!id)throw new Error('No se recibió el identificador del equipo.');if(editing)return saved;return api.createEquipmentRelation({equipoId:id,tipo:'propietario',parteTipo:'empresa',personaId:null,empresa:schoolCompany,vigenteDesde:data.fechaAdquisicion||new Date().toISOString(),notas:'Propiedad de la escuela'});}).then(function(){schoolActions.status.textContent=editing?'Equipo actualizado.':'Equipo registrado.';resetFields(schoolFields);delete schoolForm.dataset.editingId;schoolActions.button.textContent='Registrar equipo de la escuela';return loadSchool();}).catch(function(err){schoolActions.status.textContent=err.message;}).finally(function(){schoolActions.button.disabled=false;});});

    /* EQUIPAMIENTO PERSISTENTE DE ESTUDIANTES */
    var eqSection=document.createElement('section'),eqh=document.createElement('h3');eqh.textContent='Equipamiento de estudiantes';eqSection.appendChild(eqh);
    var eqHint=document.createElement('p');eqHint.className='hint';eqHint.textContent='Selecciona al estudiante. Se muestran sus equipos propios y los equipos de la escuela o de terceros que tiene asignados. La asignación permanece vigente hasta que se cambie.';eqSection.appendChild(eqHint);
    var eqForm=document.createElement('form');var ownerL=document.createElement('label');ownerL.textContent='¿A quién pertenece el equipo?';var ownerS=document.createElement('select');ownerS.name='owner';ownerS.required=true;ownerL.appendChild(ownerS);eqForm.appendChild(ownerL);
    var equipL=document.createElement('label');equipL.textContent='Equipo de esa persona o empresa';var equipS=document.createElement('select');equipS.name='equipment';equipS.required=true;equipS.disabled=true;equipL.appendChild(equipS);eqForm.appendChild(equipL);
    var recL=document.createElement('label');recL.textContent='Estudiante al que está asignado';var recS=document.createElement('select');recS.name='recipient';recS.required=true;recL.appendChild(recS);eqForm.appendChild(recL);
    var relNotes=add(eqForm,'Notas de la asignación','notasRelacion','','text',false);var relActions=actions(eqForm,'Asignar equipo');eqSection.appendChild(eqForm);
    var eqSelection=document.createElement('div');eqSelection.className='selection';eqSelection.innerHTML='<strong>Selecciona primero el propietario.</strong><span>Después aparecerán sus equipos registrados.</span>';eqSection.appendChild(eqSelection);
    var eqButtons=document.createElement('div');eqButtons.className='actions';var createOwnerBtn=document.createElement('button');createOwnerBtn.type='button';createOwnerBtn.textContent='Crear equipo para este propietario';var editOwnerBtn=document.createElement('button');editOwnerBtn.type='button';editOwnerBtn.textContent='Modificar equipo seleccionado';createOwnerBtn.disabled=editOwnerBtn.disabled=true;eqButtons.appendChild(createOwnerBtn);eqButtons.appendChild(editOwnerBtn);eqSection.appendChild(eqButtons);root.appendChild(eqSection);

    function loadOwner(owner){selectedOwner=owner;selectedEquipment=null;ownerEquipment=[];editOwnerBtn.disabled=true;createOwnerBtn.disabled=!owner;equipS.disabled=true;setOptions(equipS,[],'Cargando equipos…');if(!owner){eqSelection.innerHTML='<strong>Selecciona primero el propietario.</strong><span>Después aparecerán sus equipos registrados.</span>';return Promise.resolve();}eqSelection.innerHTML='<strong>'+ownerLabel(owner)+'</strong><span>Cargando inventario…</span>';return getOwnerEquipment(owner).then(function(list){ownerEquipment=list||[];setOptions(equipS,ownerEquipment,ownerEquipment.length?'Selecciona un equipo':'No hay equipos registrados',function(i){return {value:String(equipmentId(i)),label:equipmentLabel(i)};});equipS.disabled=false;eqSelection.innerHTML='<strong>'+ownerLabel(owner)+'</strong><span>'+ownerEquipment.length+' equipo(s) registrados.</span>';}).catch(function(err){eqSelection.innerHTML='<strong>'+ownerLabel(owner)+'</strong><span>No se pudo cargar: '+err.message+'</span>';});}
    ownerS.addEventListener('change',function(){loadOwner(findOwner(ownerS.value));});
    equipS.addEventListener('change',function(){selectedEquipment=ownerEquipment.find(function(i){return String(equipmentId(i))===String(equipS.value);})||null;editOwnerBtn.disabled=!selectedEquipment;});
    function openEquipmentEditor(owner,item){
      var old=document.getElementById('buddy-as-inline-equipment-editor');if(old)old.remove();var box=document.createElement('div');box.id='buddy-as-inline-equipment-editor';box.className='selection';var title=document.createElement('strong');title.textContent=(item?'Modificar':'Crear')+' equipo · '+ownerLabel(owner);box.appendChild(title);var form=document.createElement('form'),fields=makeEquipmentFields(form);if(item)fillFields(fields,item);var ac=actions(form,item?'Guardar cambios':'Registrar equipo');box.appendChild(form);eqSection.appendChild(box);
      form.addEventListener('submit',function(e){e.preventDefault();ac.button.disabled=true;var data=equipmentData(fields),editing=item&&equipmentId(item);if(editing)data.id=editing;var op=editing?api.updateEquipment(data):api.createEquipment(data);op.then(function(r){var saved=(r&&r.data)||r||data,id=equipmentId(saved)||editing;if(!id)throw new Error('No se recibió el identificador del equipo.');if(editing)return saved;return api.createEquipmentRelation({equipoId:id,tipo:'propietario',parteTipo:owner.type,personaId:owner.type==='persona'?owner.value:null,empresa:owner.type==='empresa'?owner.value:null,vigenteDesde:data.fechaAdquisicion||new Date().toISOString(),notas:'Propietario'});}).then(function(){ac.status.textContent='Equipo guardado.';return loadOwner(owner);}).then(function(){box.remove();refreshStudentList();}).catch(function(err){ac.status.textContent=err.message;}).finally(function(){ac.button.disabled=false;});});
    }
    createOwnerBtn.onclick=function(){if(selectedOwner)openEquipmentEditor(selectedOwner,null);};editOwnerBtn.onclick=function(){if(selectedOwner&&selectedEquipment)openEquipmentEditor(selectedOwner,selectedEquipment);};
    eqForm.addEventListener('submit',function(e){
      e.preventDefault();if(!selectedOwner){relActions.status.textContent='Selecciona el propietario.';return;}if(!selectedEquipment){relActions.status.textContent='Selecciona un equipo.';return;}if(!recS.value){relActions.status.textContent='Selecciona el estudiante que usará el equipo.';return;}
      relActions.button.disabled=true;relActions.status.textContent='Guardando asignación…';
      api.getEquipmentRelations(equipmentId(selectedEquipment)).then(function(rels){
        var activeLoans=(rels||[]).filter(function(r){return r.tipo==='prestamo'&&!r.vigenteHasta;});
        var closes=activeLoans.filter(function(r){return String(r.personaId||'')!==String(recS.value);}).map(function(r){return api.closeEquipmentRelation(r.id||r._id,new Date().toISOString());});
        return Promise.all(closes);
      }).then(function(){
        return api.getEquipmentRelations(equipmentId(selectedEquipment),{personaId:recS.value});
      }).then(function(rels){
        var current=(rels||[]).find(function(r){return r.tipo==='prestamo'&&!r.vigenteHasta;});
        if(current)return current;
        return api.createEquipmentRelation({equipoId:equipmentId(selectedEquipment),tipo:'prestamo',parteTipo:'persona',personaId:recS.value,empresa:null,vigenteDesde:new Date().toISOString(),vigenteHasta:null,notas:relNotes.value.trim()||null});
      }).then(function(){relActions.status.textContent='Equipo asignado. La asignación permanecerá vigente hasta que sea necesario cambiarla.';relNotes.value='';return loadOwner(selectedOwner);}).then(function(){refreshStudentList();}).catch(function(err){relActions.status.textContent=err.message;}).finally(function(){relActions.button.disabled=false;});
    });

    /* LISTADO DE ESTUDIANTES Y EQUIPOS */
    var listSection=document.createElement('section'),lh=document.createElement('h3');lh.textContent='Estudiantes y sus equipos';listSection.appendChild(lh);
    var lhint=document.createElement('p');lhint.className='hint';lhint.textContent='Listado operativo: muestra el equipo propio y el equipo que la escuela u otro propietario tiene asignado de forma vigente a cada estudiante.';listSection.appendChild(lhint);
    var toolbar=document.createElement('div');toolbar.className='toolbar';var search=document.createElement('input');search.type='search';search.placeholder='Buscar estudiante…';var reload=document.createElement('button');reload.type='button';reload.textContent='Actualizar listado';toolbar.appendChild(search);toolbar.appendChild(reload);listSection.appendChild(toolbar);
    var studentGrid=document.createElement('div');studentGrid.className='student-grid';listSection.appendChild(studentGrid);root.appendChild(listSection);
    var studentRows=[];
    function relationText(rel){if(rel.tipo==='propietario')return 'Propio';if(rel.tipo==='prestamo')return rel.parteTipo==='empresa'?'Equipo de la escuela':'Equipo asignado';return rel.tipo||'—';}
    function renderStudentRows(){
      studentGrid.innerHTML='';var q=(search.value||'').trim().toLowerCase();var rows=studentRows.filter(function(r){return !q||r.name.toLowerCase().indexOf(q)!==-1;});
      if(!rows.length){studentGrid.innerHTML='<div class="empty">No hay estudiantes que coincidan.</div>';return;}
      rows.forEach(function(row){var a=document.createElement('article');a.className='student-card';var title=document.createElement('h4');title.textContent=row.name;a.appendChild(title);var meta=document.createElement('div');meta.className='hint';meta.textContent='ID de perfil: '+row.id;a.appendChild(meta);var ul=document.createElement('ul');ul.className='equipment-list';if(!row.equipment.length){var none=document.createElement('li');none.textContent='Sin equipos asignados.';ul.appendChild(none);}else row.equipment.forEach(function(e){var li=document.createElement('li');li.textContent=e.label+' — '+e.relation;ul.appendChild(li);});a.appendChild(ul);var acts=document.createElement('div');acts.className='actions';var edit=document.createElement('button');edit.type='button';edit.textContent='Administrar equipos';edit.onclick=function(){enrollmentStudent.value=row.id;enrollmentStudent.dispatchEvent(new Event('change'));ownerS.value='persona:'+row.id;loadOwner(findOwner(ownerS.value));eqSection.scrollIntoView({behavior:'smooth',block:'start'});};var ficha=document.createElement('button');ficha.type='button';ficha.textContent='Ver ficha';ficha.onclick=function(){openStudentSheet(row);};acts.appendChild(edit);acts.appendChild(ficha);a.appendChild(acts);studentGrid.appendChild(a);});
    }
    function refreshStudentList(){return api.getStudents().then(function(list){students=Array.isArray(list)?list:[];return Promise.all(students.map(function(s){var id=studentId(s);return api.getEquipment({personaId:id}).then(function(eq){eq=eq||[];return Promise.all(eq.map(function(item){return api.getEquipmentRelations(equipmentId(item)).then(function(rels){return {item:item,rels:rels||[]};});})).then(function(items){return {student:s,items:items};});});}));}).then(function(rows){studentRows=rows.map(function(r){var id=studentId(r.student);return {id:id,name:studentName(r.student),student:r.student,enrollmentEstado:String((r.student.enrollment&&r.student.enrollment.estado)||r.student.estadoInscripcion||'activo'),equipment:(r.items||[]).map(function(entry){var item=entry.item,ir=(entry.rels||[]).filter(function(x){return !x.vigenteHasta;});var own=ir.find(function(x){return x.tipo==='propietario'&&x.parteTipo==='persona'&&String(x.personaId)===String(id);});var loan=ir.find(function(x){return x.tipo==='prestamo'&&x.parteTipo==='persona'&&String(x.personaId)===String(id);});return {label:equipmentLabel(item),relation:loan?relationText(loan):(own?relationText(own):'Asignado')};})};});renderStudentRows();});}
    search.addEventListener('input',renderStudentRows);reload.addEventListener('click',function(){reload.disabled=true;refreshStudentList().finally(function(){reload.disabled=false;});});

    function openStudentSheet(row){
      var s=row.student||{}, attrs=(state.attributes||[]).filter(function(a){return a&&String(a.personaId)===String(row.id)&&!a.vigenteHasta;}), mockArch=s.datosArqueria||{};
      var attr=function(type,key){var a=attrs.find(function(x){return x.tipo===type;});if(a&&a[key]!=null)return a[key];var map={altura:'altura',peso:'peso',lateralidad:'lateralidad',aperturaBrazos:'aperturaBrazos',aperturaArco:'aperturaArco',librajeActual:'librajeActual'};return mockArch[map[type]]!=null?mockArch[map[type]]:'—';};
      var lines=[];lines.push('<h1>Ficha del estudiante</h1>');lines.push('<h2>'+escapeHtml(row.name)+'</h2>');lines.push('<p><strong>Perfil:</strong> '+escapeHtml(row.id||'—')+'</p>');lines.push('<p><strong>Fecha de nacimiento:</strong> '+escapeHtml(s.fechaNacimiento||'—')+'</p>');lines.push('<p><strong>Correo:</strong> '+escapeHtml(s.email||'—')+'</p>');lines.push('<p><strong>Número celular que usa en WhatsApp:</strong> '+escapeHtml(s.phone||s.telefono||'—')+'</p>');lines.push('<p><strong>Registro en la escuela:</strong> '+escapeHtml(label(config.enrollmentStates, row.enrollmentEstado||s.estadoInscripcion||'—'))+'</p>');lines.push('');lines.push('<h3>Datos de arquería</h3><ul>');lines.push('<li>Altura: '+escapeHtml(attr('altura','valorCm'))+' cm</li>');lines.push('<li>Peso: '+escapeHtml(attr('peso','valorKg'))+' kg</li>');lines.push('<li>Lateralidad: '+escapeHtml(attr('lateralidad','valor'))+'</li>');lines.push('<li>Apertura de brazos: '+escapeHtml(attr('aperturaBrazos','valorCm'))+' cm</li>');lines.push('<li>Apertura de arco: '+escapeHtml(attr('aperturaArco','valorCm'))+' cm</li>');lines.push('<li>Libraje actual: '+escapeHtml(attr('librajeActual','valorLbs'))+' lbs</li>');lines.push('</ul><h3>Equipamiento</h3><ul>');(row.equipment||[]).forEach(function(e){lines.push('<li>'+escapeHtml(e.label)+' — '+escapeHtml(e.relation)+'</li>');});if(!row.equipment.length)lines.push('<li>Sin equipos asignados.</li>');lines.push('</ul>');
      var w=window.open('','_blank','width=800,height=900');if(!w){alert('El navegador bloqueó la ventana de la ficha. Permite ventanas emergentes para Buddy.');return;}w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Ficha - '+escapeHtml(row.name)+'</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;padding:20px;line-height:1.5}h1{margin-bottom:4px}h2{margin-top:0}li{margin:5px 0}.print{margin:20px 0;padding:8px 12px}@media print{.print{display:none}}</style></head><body>'+lines.join('')+'<button class="print" onclick="window.print()">Imprimir / guardar como PDF</button></body></html>');w.document.close();
    }
    function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

    function activeStudents(){
      return students.filter(function(s){return String((s.enrollment&&s.enrollment.estado)||s.estadoInscripcion||'activo')!=='inactivo';});
    }
    function fillStudents(){
      var active=activeStudents();
      setOptions(enrollmentStudent,students,'Selecciona un estudiante',function(s){return {value:String(studentId(s)),label:studentName(s)+(String((s.enrollment&&s.enrollment.estado)||s.estadoInscripcion||'activo')==='inactivo'?' (desactivado)':'')};});
      setOptions(attrsStudent,students,'Selecciona un estudiante',function(s){return {value:String(studentId(s)),label:studentName(s)+(String((s.enrollment&&s.enrollment.estado)||s.estadoInscripcion||'activo')==='inactivo'?' (desactivado)':'')};});
      setOptions(recS,active,'Selecciona un estudiante',function(s){return {value:String(studentId(s)),label:studentName(s)};});
      setOptions(ownerS,[schoolOwner].concat(active.map(function(s){return {type:'persona',value:studentId(s),label:studentName(s)};})),'Selecciona el propietario',function(o){return {value:ownerKey(o),label:ownerLabel(o)};});
    }
    ef.elements.sitio.addEventListener('change',function(){});

    api.getStudents().then(function(list){
      students=Array.isArray(list)?list:[];
      fillStudents();
      return Promise.all([api.getAttributes().catch(function(){return state.attributes||[];}),loadSchool(),refreshStudentList()]);
    }).then(function(){
      if(attrsStudent.value) loadStudentAttributes(attrsStudent.value);
    }).catch(function(err){studentGrid.innerHTML='<div class="empty">No se pudo cargar la lista de estudiantes: '+err.message+'</div>';});

    target.appendChild(root);return root;
  };
})(window, document);
