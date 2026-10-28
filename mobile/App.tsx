import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Zone, ZoneInput, ZoneStatus } from './src/types';
import { listZones, getZone, createZone, replaceZone, updateZone, deleteZone } from './src/api';

type Screen = 'list' | 'detail' | 'new' | 'edit';
export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState<ZoneStatus>('OPEN');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setResult('');
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error de red'); }
    finally { setBusy(false); }
  }
  async function load() { await run(async () => { setZones(await listZones()); }); }
  useEffect(() => { void load(); }, []);
  async function open(id: string) {
    await run(async () => {
      setSelected(await getZone(id)); setConfirmDelete(false); setScreen('detail');
    });
  }
  function form(edit: boolean) {
    setName(edit ? selected?.name ?? '' : '');
    setCapacity(edit ? String(selected?.capacity ?? '') : '');
    setStatus(edit ? selected?.status ?? 'OPEN' : 'OPEN');
    setError(''); setResult(''); setScreen(edit ? 'edit' : 'new');
  }
  function input(): ZoneInput {
    const n = Number(capacity);
    if (!name.trim() || name.trim().length > 100 || !/^\d+$/.test(capacity) || !Number.isSafeInteger(n) || n <= 0) {
      throw new Error('Escribe un nombre (máx. 100 caracteres) y una capacidad entera positiva.');
    }
    return { name: name.trim(), capacity: n, status };
  }
  function button(label: string, action: () => void, danger = false) {
    return <Pressable key={label} accessibilityRole="button" disabled={busy} onPress={action} style={[s.button, danger && s.danger, busy && s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
  }
  const title = { list: 'ESPACIOS', detail: 'DETALLE', new: 'NUEVO ESPACIO', edit: 'EDITAR ESPACIO' }[screen];
  return <View style={s.page}><StatusBar style="light" /><ScrollView contentContainerStyle={s.content}>
    <View style={s.header}><Text style={s.brand}>VENUE CONTROL</Text><Text style={s.live}>● OPERATIONS</Text></View>
    <Text style={s.eyebrow}>FESTIVAL OPERATIONS</Text><Text style={s.title}>{title}</Text>
    <Text style={s.note}>Catálogo fijo · las escrituras se simulan y no se guardan.</Text>
    {screen !== 'list' && button('← Volver al listado', () => { setScreen('list'); setResult(''); setError(''); })}
    {screen === 'list' && <>
      <Text style={s.muted}>{zones.length} zonas · consulta por HTTP</Text>
      {zones.map(z => <Pressable accessibilityRole="button" accessibilityLabel={'Ver ' + z.name} disabled={busy} key={z.id} style={s.card} onPress={() => void open(z.id)}>
        <View style={s.row}><Text style={s.zoneName}>{z.name.toUpperCase()}</Text><Text style={[s.status, z.status === 'CLOSED' && s.closed]}>{z.status}</Text></View>
        <Text style={s.capacity}>{z.capacity.toLocaleString('es-ES')}</Text><Text style={s.muted}>CAPACIDAD · {z.id}</Text>
      </Pressable>)}
      {!busy && zones.length === 0 && !error && <Text style={s.muted}>No hay espacios.</Text>}
      {button('＋ Nuevo espacio', () => form(false))}{button('Recargar listado', () => void load())}
    </>}
    {screen === 'detail' && selected && <>
      <View style={s.card}><Text style={s.eyebrow}>{selected.id}</Text><Text style={s.zoneName}>{selected.name}</Text><Text style={s.capacity}>{selected.capacity.toLocaleString('es-ES')}</Text><Text style={s.muted}>CAPACIDAD</Text><Text style={s.status}>{selected.status}</Text></View>
      {button('Editar espacio', () => form(true))}
      <Text style={s.label}>Cambiar estado (PATCH)</Text><View style={s.options}>{(['OPEN','FULL','CLOSED'] as const).map(v => button(v, () => void run(async () => { setResult('PATCH · ' + JSON.stringify(await updateZone(selected.id, v), null, 2)); })))}</View>
      {button('Eliminar espacio', () => setConfirmDelete(true), true)}
      {confirmDelete && <View style={s.card}><Text style={s.muted}>¿Simular la eliminación de {selected.name}?</Text>{button('Confirmar eliminación', () => void run(async () => { setResult('DELETE · ' + JSON.stringify(await deleteZone(selected.id), null, 2)); setConfirmDelete(false); }), true)}{button('Cancelar eliminación', () => setConfirmDelete(false))}</View>}
    </>}
    {(screen === 'new' || screen === 'edit') && <View style={s.card}>
      <Text style={s.label}>Nombre del espacio</Text><TextInput accessibilityLabel="Nombre del espacio" style={s.input} value={name} onChangeText={setName} editable={!busy} placeholder="Garden Stage" placeholderTextColor="#737383" />
      <Text style={s.label}>Capacidad</Text><TextInput accessibilityLabel="Capacidad" style={s.input} value={capacity} onChangeText={setCapacity} editable={!busy} keyboardType="number-pad" placeholder="2500" placeholderTextColor="#737383" />
      <Text style={s.label}>Estado: {status}</Text><View style={s.options}>{(['OPEN','FULL','CLOSED'] as const).map(v => button((status === v ? '● ' : '') + v, () => setStatus(v)))}</View>
      {button(screen === 'new' ? 'Crear espacio' : 'Guardar cambios', () => void run(async () => {
        const v = input();
        const response = screen === 'new' ? await createZone(v) : await replaceZone(selected!.id, v);
        setResult((screen === 'new' ? 'POST' : 'PUT') + ' · ' + JSON.stringify(response, null, 2));
      }))}
    </View>}
    {busy && <Text accessibilityLiveRegion="polite" style={s.muted}>Cargando…</Text>}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {result ? <View style={s.card}><Text style={s.label}>RESPUESTA DEL SERVIDOR</Text><Text accessibilityLiveRegion="polite" style={s.result}>{result}</Text><Text style={s.note}>Operación simulada. Un nuevo GET conserva los datos originales.</Text></View> : null}
  </ScrollView></View>;
}
const s = StyleSheet.create({
  page:{flex:1,backgroundColor:'#08090d'},content:{padding:24,paddingTop:40,gap:16,width:'100%',maxWidth:780,alignSelf:'center'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingBottom:24,borderBottomWidth:1,borderBottomColor:'#30303b'},brand:{color:'#ff4b9b',fontWeight:'800',letterSpacing:2},live:{color:'#9ce8bd',fontSize:11},eyebrow:{color:'#ff8fc0',letterSpacing:2,fontSize:12,fontWeight:'700'},title:{color:'#fff',fontSize:34,fontWeight:'800'},note:{color:'#a9aab8',fontSize:13,lineHeight:20},muted:{color:'#cbcbd6',fontSize:15,lineHeight:22},card:{backgroundColor:'#161620',borderWidth:1,borderColor:'#343440',borderRadius:16,padding:22,gap:14},row:{flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'},zoneName:{color:'#fff',fontWeight:'800',fontSize:22},status:{color:'#98efb9',fontSize:13,fontWeight:'800'},closed:{color:'#ffadbc'},capacity:{color:'#fff',fontSize:36,fontWeight:'800'},button:{backgroundColor:'#bd2366',borderRadius:10,padding:14,alignItems:'center'},danger:{backgroundColor:'#7d2438'},disabled:{opacity:0.5},buttonText:{color:'#fff',fontWeight:'700',fontSize:15},label:{color:'#eeeef4',fontWeight:'700',fontSize:14},input:{borderWidth:1,borderColor:'#565666',borderRadius:8,padding:13,color:'#fff',fontSize:17,backgroundColor:'#0b0b13'},options:{gap:10,flexDirection:'row',flexWrap:'wrap'},error:{color:'#ffb8bc',lineHeight:23},result:{color:'#adf4ca',fontFamily:'monospace',fontSize:13,lineHeight:21}
});
