import java.util.UUID;

public class GetUUID {
    public static void main(String[] args) {
        UUID generatedId = UUID.nameUUIDFromBytes("BCEAO-BANK-CORIBFBF".getBytes());
        System.out.println("UUID: " + generatedId.toString());
    }
}
