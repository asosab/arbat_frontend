/** ArcherySchool — vista administrativa. Presentación + interacción con el servicio. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';
  function styles(){
    if(document.getElementById('buddy-archery-school-admin-view-styles'))return;
    var s=document.createElement('style');s.id='buddy-archery-school-admin-view-styles';
    s.textContent='.buddy-as-admin{font:inherit;display:grid;gap:18px;max-width:1000px}.buddy-as-admin section{border:1px solid #ddd;border-radius:12px;padding:18px}.buddy-as-admin form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.buddy-as-admin label{display:grid;gap:6px}.buddy-as-admin input,.buddy-as-admin select,.buddy-as-admin textarea,.buddy-as-admin button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-as-admin textarea{min-height:70px}.buddy-as-admin .wide,.buddy-as-admin .status,.buddy-as-admin .actions{grid-column:1/-1}.buddy-as-admin .actions{display:flex;gap:8px;align-items:center}.buddy-as-admin .status{min-height:1.3em}.buddy-as-admin .cards{display:grid;gap:10px;margin-top:14px}.buddy-as-admin article{border:1px solid #eee;border-radius:10px;padding:12px;display:grid;gap:8px}.buddy-as-admin article h4{margin:0}.buddy-as-admin .hint{opacity:.75;font-size:.92em}.buddy-as-admin .loading{opacity:.7}.buddy-as-admin .student-summary{margin:10px 0 0;padding:10px;border-radius:8px;background:#f7f7f7}.buddy-as-admin .student-summary strong{display:block}.buddy-as-admin .empty{opacity:.7;padding:10px 0}';
    document.head.appendChild(s);
  }
  function add(form,label,name,value,type,required){
    var l=document.createElement('label');l.textContent=label;var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;if(required)i.required=true;l.appendChild(i);form.appendChild(l);return i;
  }
  function sel(form,label,name,options,value,required){
    var l=document.createElement('label');l.textContent=label;var s=document.createElement('select');s.name=name;
    var e=document.createElement('option');e.value='';e.textContent='Selecciona';s.appendChild(e);
    (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=x.value===String(value||'');s.appendChild(x);});
    if(required)s.required=true;l.appendChild(s);form.appendChild(l);return s;
  }
  function actions(form,text){
    var st=document.createElement('div');st.className='status';var a=document.createElement('div');a.className='actions';var b=document.createElement('button');b.type='submit';b.textContent=text;a.appendChild(b);form.appendChild(st);form.appendChild(a);return {status:st,button:b};
  }
  function value(item,key){ return item && item[key] != null ? item[key] : ''; }
  function studentId(student){ return student && (student.personaId || student.id || student._id); }
  function studentName(student){ return student && (student.nombreCompleto || [student.nombre, student.apellido].filter(Boolean).join(' ') || student.name || student.email || studentId(student)); }

  window.BuddyArcherySchoolViews.admin=function(context){
    styles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{},ctx=context.context||{};target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-as-admin';
    var h=document.createElement('h2');h.textContent='Administración de ArcherySchool';root.appendChild(h);
    var hint=document.createElement('p');hint.className='hint';hint.textContent='Los datos de esta vista corresponden al perfil de arquería, la inscripción, atributos y equipamiento; la cuenta Buddy universal se administra desde User.';root.appendChild(hint);

    var profile=document.createElement('section'),ph=document.createElement('h3');ph.textContent='Perfil de arquería';profile.appendChild(ph);
    var pf=document.createElement('form');
    var profileStudentLabel=document.createElement('label');profileStudentLabel.textContent='Estudiante registrado';
    var profileStudentSelect=document.createElement('select');profileStudentSelect.name='personaId';profileStudentSelect.required=true;
    var profilePlaceholder=document.createElement('option');profilePlaceholder.value='';profilePlaceholder.textContent='Selecciona un estudiante';profileStudentSelect.appendChild(profilePlaceholder);
    profileStudentLabel.appendChild(profileStudentSelect);pf.appendChild(profileStudentLabel);
    add(pf,'Nombre completo','nombreCompleto',state.profile&&state.profile.nombreCompleto,'text',true);add(pf,'Fecha de nacimiento','fechaNacimiento',state.profile&&state.profile.fechaNacimiento,'date',false);
    var active=add(pf,'Perfil activo','activo','','checkbox',false);active.checked=state.profile?state.profile.activo!==false:true;
    var pa=actions(pf,'Guardar perfil');profile.appendChild(pf);pf.addEventListener('submit',function(e){e.preventDefault();pa.button.disabled=true;api.updateProfile({nombreCompleto:pf.elements.nombreCompleto.value.trim(),fechaNacimiento:pf.elements.fechaNacimiento.value||null,activo:pf.elements.activo.checked}).then(function(){pa.status.textContent='Perfil guardado.';}).catch(function(err){pa.status.textContent=err.message;}).finally(function(){pa.button.disabled=false;});});root.appendChild(profile);

    var enrollment=document.createElement('section'),eh=document.createElement('h3');eh.textContent='Inscripción';enrollment.appendChild(eh);
    var ef=document.createElement('form');add(ef,'Sitio','sitio',state.enrollment&&state.enrollment.sitio||config.siteId,'text',true);sel(ef,'Estado','estado',config.enrollmentStates||[],state.enrollment&&state.enrollment.estado||'activo',true);add(ef,'Fecha de inscripción','fechaInscripcion',state.enrollment&&state.enrollment.fechaInscripcion,'date',true);
    var ea=actions(ef,state.enrollment?'Guardar inscripción':'Registrar inscripción');enrollment.appendChild(ef);ef.addEventListener('submit',function(e){e.preventDefault();ea.button.disabled=true;var data={personaId:pf.elements.personaId.value.trim(),sitio:ef.elements.sitio.value.trim(),estado:ef.elements.estado.value,fechaInscripcion:ef.elements.fechaInscripcion.value||null};(state.enrollment?api.updateEnrollment(data):api.createEnrollment(data)).then(function(){ea.status.textContent='Inscripción guardada.';}).catch(function(err){ea.status.textContent=err.message;}).finally(function(){ea.button.disabled=false;});});root.appendChild(enrollment);

    var eq=document.createElement('section'),qh=document.createElement('h3');qh.textContent='Equipamiento';eq.appendChild(qh);
    var studentLabel=document.createElement('label');studentLabel.textContent='Estudiante registrado';
    var studentSelect=document.createElement('select');studentSelect.name='personaId';studentSelect.required=true;
    var placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Selecciona un estudiante';studentSelect.appendChild(placeholder);studentLabel.appendChild(studentSelect);eq.appendChild(studentLabel);
    var summary=document.createElement('div');summary.className='student-summary';summary.innerHTML='<span>Selecciona un estudiante para cargar su equipamiento.</span>';eq.appendChild(summary);

    var qf=document.createElement('form');
    var equipmentId=add(qf,'ID del equipo','equipoId','','text',false);equipmentId.readOnly=true;
    sel(qf,'Tipo','tipo',config.equipmentTypes||[],'',true);add(qf,'Marca','marca','','text',false);add(qf,'Modelo','modelo','','text',false);add(qf,'Número de serie','numeroSerie','','text',false);add(qf,'Fecha de adquisición','fechaAdquisicion','','date',false);add(qf,'Fecha de baja','fechaBaja','','date',false);sel(qf,'Estado','estado',config.equipmentStates||[],'activo',true);add(qf,'Notas','notas','','text',false);
    var relationType=sel(qf,'Relación','relacionTipo',config.relationTypes||[],'propietario',true);var partyType=sel(qf,'Contraparte','parteTipo',config.relationPartyTypes||[],'persona',true);var empresa=add(qf,'Empresa','empresa','','text',false);var vigenteDesde=add(qf,'Fecha desde','vigenteDesde',new Date().toISOString().slice(0,10),'date',false);var notasRelacion=add(qf,'Notas de relación','notasRelacion','','text',false);
    var qa=actions(qf,'Registrar equipo');eq.appendChild(qf);
    var cards=document.createElement('div');cards.className='cards';eq.appendChild(cards);

    var selectedStudent=null;
    var currentEquipmentId=null;
    var students=[];

    function setStatus(text){ qa.status.textContent=text||''; }
    function resetEquipmentForm(){
      qf.reset();equipmentId.value='';qf.elements.estado.value='activo';relationType.value='propietario';partyType.value='persona';vigenteDesde.value=new Date().toISOString().slice(0,10);empresa.value='';notasRelacion.value='';qa.button.textContent='Registrar equipo';currentEquipmentId=null;
    }
    function fillEquipment(item,relation){
      currentEquipmentId=item && (item.id||item._id) || null;
      equipmentId.value=currentEquipmentId||'';qf.elements.tipo.value=value(item,'tipo');qf.elements.marca.value=value(item,'marca');qf.elements.modelo.value=value(item,'modelo');qf.elements.numeroSerie.value=value(item,'numeroSerie');qf.elements.fechaAdquisicion.value=value(item,'fechaAdquisicion') ? String(value(item,'fechaAdquisicion')).slice(0,10) : '';qf.elements.fechaBaja.value=value(item,'fechaBaja') ? String(value(item,'fechaBaja')).slice(0,10) : '';qf.elements.estado.value=value(item,'estado')||'activo';qf.elements.notas.value=value(item,'notas');
      relation=relation||{};relationType.value=value(relation,'tipo')||'propietario';partyType.value=value(relation,'parteTipo')||'persona';empresa.value=value(relation,'empresa');vigenteDesde.value=value(relation,'vigenteDesde') ? String(value(relation,'vigenteDesde')).slice(0,10) : new Date().toISOString().slice(0,10);notasRelacion.value=value(relation,'notas');qa.button.textContent='Guardar cambios';setStatus('Equipo cargado para edición.');
    }
    function renderEquipment(list,relations){
      cards.innerHTML='';
      if(!list || !list.length){var empty=document.createElement('div');empty.className='empty';empty.textContent='Este estudiante no tiene equipos registrados.';cards.appendChild(empty);return;}
      list.forEach(function(item){
        var id=item.id||item._id;var rel=(relations||[]).find(function(r){return String(r.equipoId)===String(id) && !r.vigenteHasta;});
        var a=document.createElement('article');var title=document.createElement('h4');title.textContent=[item.tipo,item.marca,item.modelo].filter(Boolean).join(' · ')||'Equipo';a.appendChild(title);
        var detail=document.createElement('div');detail.textContent=['Serie: '+(item.numeroSerie||'—'),'Estado: '+(item.estado||'—'),'Adquisición: '+(item.fechaAdquisicion||'—')].join(' · ');a.appendChild(detail);
        var relation=document.createElement('div');relation.className='hint';
        if(rel){ relation.textContent='Relación: '+(rel.tipo||'—')+(rel.parteTipo==='empresa' ? ' · '+(rel.empresa||'') : ' · '+(studentName(selectedStudent)||'')); }
        else { relation.textContent='Sin relación vigente'; }
        a.appendChild(relation);
        var edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.addEventListener('click',function(){fillEquipment(item,rel);qf.scrollIntoView({behavior:'smooth',block:'nearest'});});a.appendChild(edit);cards.appendChild(a);
      });
    }
    function loadStudent(personaId){
      selectedStudent=students.find(function(s){return String(studentId(s))===String(personaId);})||null;
      if(!selectedStudent){summary.innerHTML='<span>Selecciona un estudiante para cargar su equipamiento.</span>';cards.innerHTML='';resetEquipmentForm();return Promise.resolve();}
      pf.elements.personaId.value=studentId(selectedStudent)||'';
      profileStudentSelect.value=studentId(selectedStudent)||'';
      studentSelect.value=studentId(selectedStudent)||'';
      summary.innerHTML='<strong>'+studentName(selectedStudent)+'</strong><span>personaId: '+studentId(selectedStudent)+'</span>';
      resetEquipmentForm();
      cards.innerHTML='<div class="loading">Cargando equipos…</div>';
      return api.getEquipment({personaId:studentId(selectedStudent)}).then(function(list){
        return Promise.all((list||[]).map(function(item){return api.getEquipmentRelations(item.id||item._id,{personaId:studentId(selectedStudent)}).then(function(rels){return {item:item,rels:rels||[]};});})).then(function(rows){
          var relations=[];rows.forEach(function(row){relations=relations.concat(row.rels);});renderEquipment(list,relations);
        });
      }).catch(function(err){cards.innerHTML='<div class="empty">No se pudo cargar el equipamiento: '+err.message+'</div>';});
    }
    profileStudentSelect.addEventListener('change',function(){loadStudent(profileStudentSelect.value);});
    studentSelect.addEventListener('change',function(){loadStudent(studentSelect.value);});
    qf.addEventListener('submit',function(e){
      e.preventDefault();
      if(!selectedStudent){setStatus('Selecciona un estudiante.');return;}
      qa.button.disabled=true;
      var data={id:currentEquipmentId||undefined,tipo:qf.elements.tipo.value,marca:qf.elements.marca.value.trim()||null,modelo:qf.elements.modelo.value.trim()||null,numeroSerie:qf.elements.numeroSerie.value.trim()||null,fechaAdquisicion:qf.elements.fechaAdquisicion.value||null,fechaBaja:qf.elements.fechaBaja.value||null,estado:qf.elements.estado.value,notas:qf.elements.notas.value.trim()||null};
      var operation=currentEquipmentId?api.updateEquipment(data):api.createEquipment(data);
      operation.then(function(r){var saved=(r&&r.data)||r||data;var id=saved.id||saved._id||currentEquipmentId;return api.createEquipmentRelation({equipoId:id,tipo:relationType.value,parteTipo:partyType.value,personaId:studentId(selectedStudent),empresa:partyType.value==='empresa'?empresa.value.trim()||null:null,vigenteDesde:vigenteDesde.value||null,notas:notasRelacion.value.trim()||null});}).then(function(){setStatus(currentEquipmentId?'Equipo actualizado.':'Equipo y relación registrados.');return loadStudent(studentId(selectedStudent));}).catch(function(err){setStatus(err.message);}).finally(function(){qa.button.disabled=false;});
    });
    root.appendChild(eq);

    target.appendChild(root);
    studentSelect.disabled=true;
    profileStudentSelect.disabled=true;
    api.getStudents().then(function(list){
      students=Array.isArray(list)?list:[];
      students.forEach(function(student){
        var id=studentId(student)||'', name=studentName(student);
        var o=document.createElement('option');o.value=id;o.textContent=name;studentSelect.appendChild(o);
        var po=document.createElement('option');po.value=id;po.textContent=name;profileStudentSelect.appendChild(po);
      });
      studentSelect.disabled=false;
      profileStudentSelect.disabled=false;
      var initial=ctx.personaId || (state.profile&&(state.profile.id||state.profile._id));
      if(initial && students.some(function(s){return String(studentId(s))===String(initial);})){studentSelect.value=initial;return loadStudent(initial);}
    }).catch(function(err){studentSelect.disabled=true;profileStudentSelect.disabled=true;summary.textContent='No se pudo cargar la lista de estudiantes: '+err.message;});
    return root;
  };
})(window, document);
