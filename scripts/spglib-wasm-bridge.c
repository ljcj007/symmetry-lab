/* Small JSON transport for the unmodified spglib 2.8.0 C API.
 * Lattice arguments/results use Python's row-vector convention.
 * This bridge is project code; spglib itself retains its BSD-3-Clause license. */
#include <spglib.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { char *data; size_t size, capacity; int failed; } Json;
static void append(Json *j, const char *format, ...) {
    if (j->failed) return;
    va_list args, copy;
    va_start(args, format); va_copy(copy, args);
    int n = vsnprintf(NULL, 0, format, copy); va_end(copy);
    if (n < 0) { j->failed = 1; va_end(args); return; }
    if (j->size + (size_t)n + 1 > j->capacity) {
        size_t capacity = (j->size + (size_t)n + 1) * 2;
        char *next = realloc(j->data, capacity);
        if (!next) { j->failed = 1; va_end(args); return; }
        j->data = next; j->capacity = capacity;
    }
    vsnprintf(j->data + j->size, j->capacity - j->size, format, args);
    va_end(args); j->size += (size_t)n;
}
static char *finish(Json *j) {
    if (j->failed) { free(j->data); return NULL; }
    return j->data;
}
static void string(Json *j, const char *value) {
    append(j,"\"");
    for(const unsigned char *p=(const unsigned char *)value;*p;p++) {
        if(*p=='"'||*p=='\\') append(j,"\\%c",*p);
        else if(*p<32) append(j,"\\u%04x",*p);
        else append(j,"%c",*p);
    }
    append(j,"\"");
}
static void ints(Json *j, const int *values, int n) {
    append(j, "[");
    for (int i=0;i<n;i++) append(j, "%s%d", i ? "," : "", values[i]);
    append(j, "]");
}
static void doubles(Json *j, const double *values, int n) {
    append(j, "[");
    for (int i=0;i<n;i++) append(j, "%s%.17g", i ? "," : "", values[i]);
    append(j, "]");
}
static void matrix(Json *j, const double a[3][3], int transpose) {
    append(j,"[");
    for (int i=0;i<3;i++) {
        double row[3]; for(int k=0;k<3;k++) row[k]=transpose?a[k][i]:a[i][k];
        if(i) append(j,","); doubles(j,row,3);
    }
    append(j,"]");
}
static void operations(Json *j, const int (*r)[3][3], const double (*t)[3], int n) {
    append(j,"\"rotations\":[");
    for(int i=0;i<n;i++) {
        append(j,"%s[",i?",":"");
        for(int k=0;k<3;k++) { if(k)append(j,","); ints(j,r[i][k],3); }
        append(j,"]");
    }
    append(j,"],\"translations\":[");
    for(int i=0;i<n;i++) { if(i)append(j,","); doubles(j,t[i],3); }
    append(j,"]");
}
static char *error(void) {
    Json j={0}; append(&j,"{\"error\":\"%s\"}",spg_get_error_message(spg_get_error_code()));
    return finish(&j);
}
static void transpose_lattice(double target[3][3], const double *source) {
    for(int i=0;i<3;i++) for(int k=0;k<3;k++) target[i][k]=source[3*k+i];
}
char *sl_dataset(const double *lattice, const double (*positions)[3], const int *types,
                 int n, int hall, double symprec, double angle) {
    double lat[3][3]; transpose_lattice(lat,lattice);
    SpglibDataset *d=spgat_get_dataset_with_hall_number(lat,positions,types,n,hall,symprec,angle);
    if(!d) return error();
    Json j={0};
    append(&j,"{\"number\":%d,\"hall_number\":%d,\"international\":\"%s\",\"hall\":",d->spacegroup_number,d->hall_number,d->international_symbol);
    string(&j,d->hall_symbol);
    append(&j,",\"choice\":\"%s\",\"pointgroup\":\"%s\",",d->choice,d->pointgroup_symbol);
    operations(&j,d->rotations,d->translations,d->n_operations);
    append(&j,",\"transformation_matrix\":"); matrix(&j,d->transformation_matrix,0);
    append(&j,",\"origin_shift\":"); doubles(&j,d->origin_shift,3);
    append(&j,",\"primitive_lattice\":"); matrix(&j,d->primitive_lattice,1);
    append(&j,",\"std_lattice\":"); matrix(&j,d->std_lattice,1);
    append(&j,",\"std_rotation_matrix\":"); matrix(&j,d->std_rotation_matrix,0);
    append(&j,",\"std_types\":"); ints(&j,d->std_types,d->n_std_atoms);
    append(&j,",\"std_mapping_to_primitive\":"); ints(&j,d->std_mapping_to_primitive,d->n_std_atoms);
    append(&j,",\"equivalent_atoms\":"); ints(&j,d->equivalent_atoms,n);
    append(&j,",\"crystallographic_orbits\":"); ints(&j,d->crystallographic_orbits,n);
    append(&j,",\"mapping_to_primitive\":"); ints(&j,d->mapping_to_primitive,n);
    append(&j,",\"std_positions\":[");
    for(int i=0;i<d->n_std_atoms;i++){if(i)append(&j,","); doubles(&j,d->std_positions[i],3);}
    append(&j,"],\"wyckoffs\":[");
    const char *letters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(int i=0;i<n;i++) append(&j,"%s\"%c\"",i?",":"",letters[d->wyckoffs[i]]);
    append(&j,"],\"site_symmetry_symbols\":[");
    for(int i=0;i<n;i++) append(&j,"%s\"%s\"",i?",":"",d->site_symmetry_symbols[i]);
    append(&j,"]}"); spg_free_dataset(d); return finish(&j);
}
char *sl_database(int hall) {
    int r[192][3][3]; double t[192][3];
    int n=spg_get_symmetry_from_database(r,t,hall);
    if(!n)return error();
    Json j={0}; append(&j,"{"); operations(&j,r,t,n); append(&j,"}"); return finish(&j);
}
char *sl_type(int hall) {
    SpglibSpacegroupType d=spg_get_spacegroup_type(hall);
    if(!d.number)return error();
    Json j={0};
    append(&j,"{\"number\":%d,\"international_short\":\"%s\",\"international_full\":\"%s\",\"international\":\"%s\",\"schoenflies\":\"%s\",\"hall_number\":%d,\"hall_symbol\":",d.number,d.international_short,d.international_full,d.international,d.schoenflies,d.hall_number);
    string(&j,d.hall_symbol);
    append(&j,",\"choice\":\"%s\",\"pointgroup_international\":\"%s\",\"pointgroup_schoenflies\":\"%s\",\"arithmetic_crystal_class_number\":%d,\"arithmetic_crystal_class_symbol\":\"%s\"}",d.choice,d.pointgroup_international,d.pointgroup_schoenflies,d.arithmetic_crystal_class_number,d.arithmetic_crystal_class_symbol);
    return finish(&j);
}
char *sl_standardize(const double *lattice, const double (*positions)[3], const int *types,
                     int n, int primitive, int no_idealize, double symprec, double angle) {
    double lat[3][3]; transpose_lattice(lat,lattice);
    double (*pos)[3]=malloc((size_t)n*4*sizeof(*pos));
    int *typ=malloc((size_t)n*4*sizeof(*typ));
    if(!pos||!typ){free(pos);free(typ);return NULL;}
    memcpy(pos,positions,(size_t)n*sizeof(*pos));memcpy(typ,types,(size_t)n*sizeof(*typ));
    int count=spgat_standardize_cell(lat,pos,typ,n,primitive,no_idealize,symprec,angle);
    if(!count){free(pos);free(typ);return error();}
    Json j={0};append(&j,"{\"lattice\":");matrix(&j,lat,1);append(&j,",\"positions\":[");
    for(int i=0;i<count;i++){if(i)append(&j,",");doubles(&j,pos[i],3);}
    append(&j,"],\"numbers\":");ints(&j,typ,count);append(&j,"}");
    free(pos);free(typ);return finish(&j);
}
