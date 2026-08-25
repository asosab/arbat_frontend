/** ArcherySchool — vista del estudiante. Presentación + interacción con el servicio. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';

  function styles() {
    if (document.getElementById('buddy-archery-school-student-styles')) return;
    var s=document.createElement('style');s.id='buddy-archery-school-student-styles';
    s.textContent=[
      '.buddy-as-student{font:inherit;display:grid;gap:18px;max-width:900px}',
      '.buddy-as-student section{border:1px solid #ddd;border-radius:12px;padding:18px}',
      '.buddy-as-student form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}',
      '.buddy-as-student label{display:grid;gap:6px}',
      '.buddy-as-student input,.buddy-as-student select,.buddy-as-student textarea,.buddy-as-student button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}',
      '.buddy-as-student textarea{min-height:80px;resize:vertical}',
      '.buddy-as-student .wide{grid-column:1/-1}',
      '.buddy-as-student .actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.buddy-as-student .status{grid-column:1/-1;min-height:1.3em}',
      '.buddy-as-student .cards{display:grid;gap:8px;margin-top:14px}',
      '.buddy-as-student article{border:1px solid #eee;border-radius:10px;padding:12px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
      '.buddy-as-student article .meta{display:grid;gap:3px}',
      '.buddy-as-student article button{padding:6px 9px;cursor:pointer}',
      '.buddy-as-student .hint{opacity:.75;font-size:.92em}'
    ].join('');
    document.head.appendChild(s);
  }
  function current(state,type){
    var a=(state.attributes||[]).filter(function(x){return x&&x.tipo===type&&!x.vigenteHasta;});
    return a.length?a[a.length-1]:null;
  }
  function value(state,type,key){
    var a=current(state,type);return a&&a[key]!=null?a[key]:'';
  }
  function label(options,value){
    for(var i=0;i<(options||[]).length;i++){
      if((options[i].value||options[i])===value) return options[i].label||options[i];
    }
    return value||'';
  }
  function input(form,labelText,name,value,type,required){
    var l=document.createElement('label');l.textContent=labelText;
    var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;
    if(required)i.required=true;l.appendChild(i);form.appendChild(l);return i;
  }
  function select(form,labelText,name,options,value,required){
    var l=document.createElement('label');l.textContent=labelText;
    var s=document.createElement('select');s.name=name;
    var empty=document.createElement('option');empty.value='';empty.textContent='Selecciona';s.appendChild(empty);
    (options||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value||o;x.textContent=o.label||o;x.selected=(x.value===String(value||''));s.appendChild(x);});
    if(required)s.required=true;l.appendChild(s);form.appendChild(l);return s;
  }
  function statusAndButton(form,text){
    var st=document.createElement('div');st.className='status';var actions=document.createElement('div');actions.className='actions';
    var b=document.createElement('button');b.type='submit';b.textContent=text;actions.appendChild(b);form.appendChild(st);form.appendChild(actions);return {status:st,button:b};
  }

  window.BuddyArcherySchoolViews.student=function(context){
    styles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{};
    target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-as-student';

    var title=document.createElement('h2');title.textContent=config.schoolName||'ArcherySchool';root.appendChild(title);
    var intro=document.createElement('p');intro.className='hint';intro.textContent='Aquí puedes administrar tu perfil de arquería, tu inscripción y los equipos relacionados contigo.';root.appendChild(intro);

    /* PERFIL */
    var profile=document.createElement('section');var ph=document.createElement('h3');ph.textContent='Perfil de arquería';profile.appendChild(ph);
    var pf=document.createElement('form');
    input(pf,'Nombre completo','nombreCompleto',state.profile&&state.profile.nombreCompleto,'text',true);
    input(pf,'Fecha de nacimiento','fechaNacimiento',state.profile&&state.profile.fechaNacimiento,'date',false);
    var activo=input(pf,'Perfil activo','activo', '', 'checkbox',false);activo.checked=state.profile?state.profile.activo!==false:true;
    var ps=statusAndButton(pf,'Guardar perfil');profile.appendChild(pf);
    pf.addEventListener('submit',function(e){
      e.preventDefault();ps.button.disabled=true;ps.status.textContent='Guardando…';
      api.updateProfile({nombreCompleto:pf.elements.nombreCompleto.value.trim(),fechaNacimiento:pf.elements.fechaNacimiento.value||null,activo:pf.elements.activo.checked})
        .then(function(){ps.status.textContent='Perfil guardado.';}).catch(function(err){ps.status.textContent=err.message;}).finally(function(){ps.button.disabled=false;});
    });
    root.appendChild(profile);

    /* INSCRIPCIÓN */
    var enrollment=document.createElement('section');var eh=document.createElement('h3');eh.textContent='Inscripción en la escuela';enrollment.appendChild(eh);
    var ef=document.createElement('form');
    input(ef,'Sitio','sitio',(state.enrollment&&state.enrollment.sitio)||config.siteId||((window.BuddyConfig||{}).app||{}).siteId,'text',true);
    select(ef,'Estado','estado',config.enrollmentStates||[],state.enrollment&&state.enrollment.estado||'activo',true);
    input(ef,'Fecha de inscripción','fechaInscripcion',state.enrollment&&state.enrollment.fechaInscripcion||'','date',true);
    var es=statusAndButton(ef,state.enrollment?'Guardar inscripción':'Registrar inscripción');enrollment.appendChild(ef);
    ef.addEventListener('submit',function(e){
      e.preventDefault();es.button.disabled=true;es.status.textContent='Guardando…';
      var data={personaId:state.profile&&(state.profile.id||state.profile._id),sitio:ef.elements.sitio.value.trim(),estado:ef.elements.estado.value,fechaInscripcion:ef.elements.fechaInscripcion.value||null};
      var action=state.enrollment?api.updateEnrollment(data):api.createEnrollment(data);
      action.then(function(){es.status.textContent='Inscripción guardada.';}).catch(function(err){es.status.textContent=err.message;}).finally(function(){es.button.disabled=false;});
    });
    root.appendChild(enrollment);

    /* ATRIBUTOS */
    var attrs=document.createElement('section');var ah=document.createElement('h3');ah.textContent='Medidas y características de arquería';attrs.appendChild(ah);
    var af=document.createElement('form');
    input(af,'Altura (cm)','altura',value(state,'altura','valorCm'),'number',false);
    input(af,'Peso (kg)','peso',value(state,'peso','valorKg'),'number',false);
    select(af,'Lateralidad','lateralidad',config.lateralidad||[],value(state,'lateralidad','valor'),false);
    input(af,'Género','genero',value(state,'genero','valor'),'text',false);
    input(af,'Apertura de brazos (cm)','aperturaBrazos',value(state,'aperturaBrazos','valorCm'),'number',false);
    input(af,'Apertura de arco (cm)','aperturaArco',value(state,'aperturaArco','valorCm'),'number',false);
    input(af,'Libraje actual (lbs)','librajeActual',value(state,'librajeActual','valorLbs'),'number',false);
    input(af,'Variación base','variacionBase',value(state,'variacionBase','valor'),'text',false);
    select(af,'Posibilidad de adquisición','posibilidadAdquisicion',config.posibilidadAdquisicion||[],value(state,'posibilidadAdquisicion','valor'),false);
    var source=select(af,'Fuente de los datos','fuente',config.attributeSources||[],'autorreportado',false);
    var as=statusAndButton(af,'Guardar medidas');attrs.appendChild(af);
    af.addEventListener('submit',function(e){
      e.preventDefault();as.button.disabled=true;as.status.textContent='Guardando…';
      var jobs=[];
      function add(type,key,cast){
        var v=af.elements[type]&&af.elements[type].value;if(v==null||v==='')return;
        var d={personaId:state.profile&&(state.profile.id||state.profile._id),tipo:type,sitio:config.siteId||((window.BuddyConfig||{}).app||{}).siteId||null,fuente:source.value||'autorreportado'};
        d[key]=cast?cast(v):v;jobs.push(api.setAttribute(d));
      }
      add('altura','valorCm',Number);add('peso','valorKg',Number);add('lateralidad','valor');add('genero','valor');
      add('aperturaBrazos','valorCm',Number);add('aperturaArco','valorCm',Number);add('librajeActual','valorLbs',Number);
      add('variacionBase','valor');add('posibilidadAdquisicion','valor');
      Promise.all(jobs).then(function(){as.status.textContent='Medidas guardadas.';}).catch(function(err){as.status.textContent=err.message;}).finally(function(){as.button.disabled=false;});
    });
    root.appendChild(attrs);

    /* DOCUMENTO */
    var doc=document.createElement('section');var dh=document.createElement('h3');dh.textContent='Documento de identidad';doc.appendChild(dh);
    var d=current(state,'documentoIdentidad')||{};var df=document.createElement('form');
    input(df,'Tipo de documento','tipoDocumento',d.tipoDocumento||'CI','text',true);
    input(df,'Número','numero',d.numero||'','text',true);
    input(df,'País emisor','paisEmisor',d.paisEmisor||'','text',true);
    var principal=input(df,'Es documento principal','esPrincipal','','checkbox',false);principal.checked=d.esPrincipal!==false;
    var ds=statusAndButton(df,'Guardar documento');doc.appendChild(df);
    df.addEventListener('submit',function(e){
      e.preventDefault();ds.button.disabled=true;
      api.setAttribute({personaId:state.profile&&(state.profile.id||state.profile._id),tipo:'documentoIdentidad',tipoDocumento:df.elements.tipoDocumento.value.trim(),numero:df.elements.numero.value.trim(),paisEmisor:df.elements.paisEmisor.value.trim(),esPrincipal:df.elements.esPrincipal.checked,fuente:'autorreportado'})
        .then(function(){ds.status.textContent='Documento guardado.';}).catch(function(err){ds.status.textContent=err.message;}).finally(function(){ds.button.disabled=false;});
    });
    root.appendChild(doc);

    /* EQUIPOS */
    var eq=document.createElement('section');var qh=document.createElement('h3');qh.textContent='Mis equipos';eq.appendChild(qh);
    var qhint=document.createElement('p');qhint.className='hint';qhint.textContent='El equipo y su relación de propiedad o préstamo son datos separados. La posibilidad de adquirir equipo pertenece a tu perfil, no al equipo.';eq.appendChild(qhint);
    var qf=document.createElement('form');
    select(qf,'Tipo de equipo','tipo',config.equipmentTypes||[],'',true);
    input(qf,'Marca','marca','','text',false);input(qf,'Modelo','modelo','','text',false);input(qf,'Número de serie','numeroSerie','','text',false);
    input(qf,'Fecha de adquisición','fechaAdquisicion','','date',false);
    select(qf,'Estado','estado',config.equipmentStates||[],'activo',true);
    input(qf,'Notas','notas','','text',false);
    select(qf,'Relación','relacionTipo',config.relationTypes||[],'propietario',true);
    select(qf,'Contraparte','parteTipo',config.relationPartyTypes||[],'persona',true);
    input(qf,'Empresa','empresa','','text',false);
    input(qf,'Fecha desde','vigenteDesde',new Date().toISOString().slice(0,10),'date',false);
    input(qf,'Notas de la relación','notasRelacion','','text',false);
    var qs=statusAndButton(qf,'Registrar equipo');eq.appendChild(qf);
    var cards=document.createElement('div');cards.className='cards';eq.appendChild(cards);

    function renderEquipment(){
      cards.innerHTML='';
      var items=state.equipment||[];
      if(!items.length){cards.textContent='No hay equipos registrados.';return;}
      items.forEach(function(item){
        var article=document.createElement('article'),meta=document.createElement('div');meta.className='meta';
        var strong=document.createElement('strong');strong.textContent=[item.tipo,item.marca,item.modelo].filter(Boolean).join(' · ')||'Equipo';meta.appendChild(strong);
        var line=document.createElement('span');line.textContent=['Serie: '+(item.numeroSerie||'—'),'Estado: '+label(config.equipmentStates,item.estado),'Adquisición: '+(item.fechaAdquisicion||'—')].join(' · ');meta.appendChild(line);
        var rel=(state.equipmentRelations||[]).filter(function(r){return String(r.equipoId)===String(item.id||item._id)&&!r.vigenteHasta;});
        rel.forEach(function(r){var rl=document.createElement('span');rl.textContent='Relación: '+label(config.relationTypes,r.tipo)+(r.parteTipo==='empresa'?' · '+(r.empresa||'empresa'):' · estudiante');meta.appendChild(rl);});
        article.appendChild(meta);
        var edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.addEventListener('click',function(){
          qf.elements.tipo.value=item.tipo||'';qf.elements.marca.value=item.marca||'';qf.elements.modelo.value=item.modelo||'';qf.elements.numeroSerie.value=item.numeroSerie||'';
          qf.elements.fechaAdquisicion.value=item.fechaAdquisicion||'';qf.elements.estado.value=item.estado||'activo';qf.elements.notas.value=item.notas||'';
          qf.dataset.editingId=item.id||item._id||'';qs.button.textContent='Guardar cambios';qs.status.textContent='Editando equipo.';
        });article.appendChild(edit);cards.appendChild(article);
      });
    }
    qf.addEventListener('submit',function(e){
      e.preventDefault();qs.button.disabled=true;qs.status.textContent='Guardando…';
      var data={tipo:qf.elements.tipo.value,marca:qf.elements.marca.value.trim()||null,modelo:qf.elements.modelo.value.trim()||null,numeroSerie:qf.elements.numeroSerie.value.trim()||null,fechaAdquisicion:qf.elements.fechaAdquisicion.value||null,estado:qf.elements.estado.value,notas:qf.elements.notas.value.trim()||null};
      var editing=qf.dataset.editingId;
      var equipmentAction=editing?api.updateEquipment(Object.assign({id:editing},data)):api.createEquipment(data);
      equipmentAction.then(function(result){
        var equipmentId=editing||((result&&result.data)&&(result.data.id||result.data._id));
        if(!equipmentId) return null;
        var relation={equipoId:equipmentId,tipo:qf.elements.relacionTipo.value,parteTipo:qf.elements.parteTipo.value,personaId:qf.elements.parteTipo.value==='persona'?(state.profile&&(state.profile.id||state.profile._id)):null,empresa:qf.elements.parteTipo.value==='empresa'?qf.elements.empresa.value.trim()||null:null,vigenteDesde:qf.elements.vigenteDesde.value||null,notas:qf.elements.notasRelacion.value.trim()||null};
        return api.createEquipmentRelation(relation);
      }).then(function(){qs.status.textContent=editing?'Equipo actualizado.':'Equipo registrado.';qf.reset();qf.elements.estado.value='activo';qf.elements.relacionTipo.value='propietario';qf.elements.parteTipo.value='persona';qf.elements.vigenteDesde.value=new Date().toISOString().slice(0,10);delete qf.dataset.editingId;qs.button.textContent='Registrar equipo';renderEquipment();})
      .catch(function(err){qs.status.textContent=err.message;}).finally(function(){qs.button.disabled=false;});
    });
    root.appendChild(eq);renderEquipment();

    target.appendChild(root);return root;
  };
})(window, document);
