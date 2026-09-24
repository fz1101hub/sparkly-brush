import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
} from "@/constants/accessibility-colors";
import { useBrush } from "@/contexts/brush-context";
import { useColors } from "@/hooks/use-colors";
import type { BrushSession } from "@/lib/brush-types";

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { history, clearAllHistory } = useBrush();
  const completed = history.filter((session) => session.completed).length;
  const average = history.length
    ? Math.round(
        history.reduce((total, session) => total + session.durationSeconds, 0) /
          history.length,
      )
    : 0;

  const confirmClear = () => {
    Alert.alert(
      "Eliminare lo storico?",
      "Le sessioni salvate su questo telefono verranno rimosse.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => void clearAllHistory(),
        },
      ],
    );
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: BrushSession;
    index: number;
  }) => (
    <View
      testID={`history-session-${index}`}
      accessibilityLabel={`${item.completed ? "Sessione completa" : "Sessione incompleta"}, ${formatDuration(item.durationSeconds)}, ${formatDate(item.startedAt)}`}
      style={[
        styles.sessionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.sessionIcon,
          { backgroundColor: item.completed ? "#E1F7EF" : "#FFF0E4" },
        ]}
      >
        <MaterialIcons
          name={item.completed ? "verified" : "timelapse"}
          size={24}
          color={item.completed ? colors.success : colors.warning}
        />
      </View>
      <View style={styles.sessionCopy}>
        <Text style={[styles.sessionTitle, { color: colors.foreground }]}>
          {formatDate(item.startedAt)}
        </Text>
        <Text style={[styles.sessionSubtitle, { color: colors.muted }]}>
          {item.source === "device"
            ? "Sincronizzata dallo spazzolino"
            : "Timer guidato"}
        </Text>
      </View>
      <View style={styles.durationBlock}>
        <Text style={[styles.duration, { color: colors.foreground }]}>
          {formatDuration(item.durationSeconds)}
        </Text>
        <Text style={[styles.goal, { color: colors.muted }]}>
          su {formatDuration(item.targetSeconds)}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        testID="history-screen"
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <AppHeader eyebrow="I tuoi progressi" title="Storico" />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/parent")}
              style={({ pressed }) => [
                styles.parentCard,
                { backgroundColor: "#F4F6FF", borderColor: "#DCE3FF" },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.parentIcon}>
                <MaterialIcons
                  name="family-restroom"
                  size={25}
                  color={colors.primary}
                />
              </View>
              <View style={styles.parentCopy}>
                <Text style={[styles.parentEyebrow, { color: "#173F9F" }]}>
                  AREA GENITORI
                </Text>
                <Text
                  style={[styles.parentTitle, { color: LIGHT_CARD_FOREGROUND }]}
                >
                  Riepilogo settimanale
                </Text>
                <Text style={[styles.parentText, { color: LIGHT_CARD_MUTED }]}>
                  Mattina/sera, durata, tentativi e sessioni sincronizzate.
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={LIGHT_CARD_MUTED}
              />
            </Pressable>

            <View style={styles.statsRow}>
              <View
                style={[styles.summaryCard, { backgroundColor: "#E7EEFF" }]}
              >
                <Text style={[styles.summaryValue, { color: "#173F9F" }]}>
                  {history.length}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: LIGHT_CARD_MUTED }]}
                >
                  sessioni
                </Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: "#E1F7EF" }]}
              >
                <Text style={[styles.summaryValue, { color: "#17633F" }]}>
                  {completed}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: LIGHT_CARD_MUTED }]}
                >
                  complete
                </Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: "#FFF0E4" }]}
              >
                <Text style={[styles.summaryValue, { color: "#9A3F0D" }]}>
                  {Math.round(average / 60)}m
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: LIGHT_CARD_MUTED }]}
                >
                  media
                </Text>
              </View>
            </View>
            {history.length > 0 ? (
              <View style={styles.listHeading}>
                <Text style={[styles.listTitle, { color: colors.foreground }]}>
                  Ultime sessioni
                </Text>
                <Pressable
                  onPress={confirmClear}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.clearText, { color: colors.error }]}>
                    Svuota
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="auto-awesome"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Il viaggio inizia qui
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Completa una sessione guidata oppure sincronizza lo spazzolino per
              vedere i progressi.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  headerContent: { gap: 20, marginBottom: 14 },
  parentCard: {
    borderWidth: 1,
    borderRadius: 21,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  parentIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: "#FFFFFFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  parentCopy: { flex: 1 },
  parentEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  parentTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  parentText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 9 },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  summaryValue: { fontSize: 24, lineHeight: 30, fontWeight: "900" },
  summaryLabel: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  listHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  listTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  clearButton: { paddingHorizontal: 10, paddingVertical: 8 },
  clearText: { fontSize: 13, fontWeight: "800" },
  sessionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCopy: { flex: 1 },
  sessionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  sessionSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  durationBlock: { alignItems: "flex-end" },
  duration: { fontSize: 18, lineHeight: 23, fontWeight: "900" },
  goal: { fontSize: 10, lineHeight: 15 },
  separator: { height: 10 },
  empty: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    marginTop: 12,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: "#E7EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },
  pressed: { opacity: 0.65 },
});
